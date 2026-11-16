(() => {
  const video=document.getElementById('live-line-video'),stage=document.getElementById('live-line-stage');
  if(!video||!stage)return;
  const start=document.getElementById('live-line-start'),stop=document.getElementById('live-line-stop');
  const voiceButton=document.getElementById('live-line-voice');
  let voiceEnabled=false;
  const mode=document.getElementById('live-line-mode'),mirror=document.getElementById('live-line-mirror');
  const guides=document.getElementById('live-line-guides'),status=document.getElementById('live-line-status');
  const feedback=document.getElementById('live-line-feedback'),canvas=document.getElementById('live-line-pose');
  const ctx=canvas.getContext('2d');
  // More responsive tracking: accept weaker landmark confidence while filtering near-invisible points.
  const DETECTION_CONFIDENCE=.15, PRESENCE_CONFIDENCE=.15, TRACKING_CONFIDENCE=.15, LANDMARK_VISIBILITY=.05;
  const verdict=document.getElementById('live-line-verdict'),detail=document.getElementById('live-line-detail');
  let stream=null,landmarker=null,raf=0,lastVideoTime=-1,loading=false,mirrorOn=true,lastDetectAt=0,trackingActive=false,uploadedVideoUrl=null,referenceVideoUrl=null,referenceLandmarks=null,compareTimestamp=0;\n  const referenceVideo=document.getElementById('live-line-reference-video');\n  const referenceInput=document.getElementById('live-line-reference-upload');\n  const matchOutput=document.getElementById('live-line-match'),compareDetail=document.getElementById('live-line-compare-detail');
  const connections=[[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]];
  function setVerdict(title,description,state='neutral'){verdict.textContent=title;detail.textContent=description;verdict.dataset.state=state;}
  function sizeCanvas(){const r=stage.getBoundingClientRect();const d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);}
  function drawPose(landmarks){
    const w=stage.clientWidth,h=stage.clientHeight;ctx.clearRect(0,0,w,h);
    const vw=video.videoWidth||w,vh=video.videoHeight||h;
    const scale=Math.max(w/vw,h/vh),renderW=vw*scale,renderH=vh*scale;
    const cropX=(w-renderW)/2,cropY=(h-renderH)/2;
    const point=p=>({x:(mirrorOn?1-p.x:p.x)*renderW+cropX,y:p.y*renderH+cropY,visible:(p.visibility??1)>LANDMARK_VISIBILITY});
    ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#ff78a9';ctx.shadowColor='#ff78a9';ctx.shadowBlur=8;
    connections.forEach(([a,b])=>{const p=point(landmarks[a]),q=point(landmarks[b]);if(!p.visible||!q.visible)return;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();});
    ctx.shadowBlur=0;
    landmarks.forEach((lm,i)=>{const p=point(lm);if(!p.visible)return;ctx.beginPath();ctx.arc(p.x,p.y,i>=15&&i<=22?5:4,0,Math.PI*2);ctx.fillStyle=(i>=15&&i<=22)?'#ffe4ed':'#fff';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#b51e4e';ctx.stroke();});
    const shown=landmarks.filter(p=>(p.visibility??1)>LANDMARK_VISIBILITY).length;
    feedback.textContent='Body detected · '+shown+' of 33 tracking points visible. Move naturally and watch the pink lines follow.';
    assess(landmarks);\n    updateReferenceMatch(landmarks);
  }
  function updateReferenceMatch(current){
    if(!referenceVideoUrl||!referenceVideo||referenceVideo.readyState<2||referenceVideo.paused){
      if(matchOutput)matchOutput.textContent='—';
      if(compareDetail)compareDetail.textContent=referenceVideoUrl?'Press play on the reference video, then start your camera.':'Upload a reference video to compare your body-line positions.';
      return;
    }
    try{
      const result=landmarker.detectForVideo(referenceVideo,Math.max(performance.now(),compareTimestamp+1));
      compareTimestamp=Math.max(performance.now(),compareTimestamp+1);
      const ref=result.landmarks&&result.landmarks[0];
      if(!ref){if(matchOutput)matchOutput.textContent='—';if(compareDetail)compareDetail.textContent='Waiting for a clear dancer pose in the reference video.';return;}
      const joints=[11,12,13,14,15,16,23,24,25,26,27,28,29,30,31,32];
      let total=0,count=0;
      joints.forEach(i=>{
        const a=current[i],b=ref[i];
        if((a.visibility??1)<.15||(b.visibility??1)<.15)return;
        const dx=a.x-b.x,dy=a.y-b.y;
        total+=Math.sqrt(dx*dx+dy*dy);count++;
      });
      if(count<8){if(matchOutput)matchOutput.textContent='—';if(compareDetail)compareDetail.textContent='Show both dancers clearly for a reliable comparison.';return;}
      const average=total/count;
      const score=Math.max(0,Math.min(100,Math.round(100*(1-average/.42))));
      if(matchOutput)matchOutput.textContent=score+'%';
      if(compareDetail)compareDetail.textContent=score>=90?'Very close pose match. Keep following the reference timing.':score>=75?'Good match. Check the joint lines that look most different.':score>=55?'Some positions match. Compare your arm, hip and leg angles with the reference.':'Your current pose differs from this reference frame. Pause and compare the body lines one section at a time.';
    }catch(_){if(compareDetail)compareDetail.textContent='Comparison is catching up. Keep both videos playing.';}
  }
  let lastPlacementTier='';
  function assess(l){
    const core=[11,12,23,24].every(i=>(l[i].visibility??1)>.18);
    const visibleCount=l.filter(p=>(p.visibility??1)>.12).length;
    if(!core){
      setVerdict('Finding your body','Keep your shoulders and hips visible, face the camera and improve the lighting.');
      reportPlacement('BAD','Move into the camera frame so your shoulders and hips can be seen.');
      return;
    }
    const shoulderMid=(l[11].x+l[12].x)/2,hipMid=(l[23].x+l[24].x)/2;
    const centerOffset=Math.abs(shoulderMid-hipMid);
    const shoulderTilt=Math.abs(l[11].y-l[12].y);
    const hipTilt=Math.abs(l[23].y-l[24].y);
    const torsoAligned=centerOffset<.045&&shoulderTilt<.035&&hipTilt<.04;
    const closeToAligned=centerOffset<.075&&shoulderTilt<.06&&hipTilt<.07;
    const mostlyAligned=centerOffset<.12&&shoulderTilt<.10&&hipTilt<.11;
    const tier=visibleCount<20||centerOffset>.20?'BAD':torsoAligned&&visibleCount>=29?'BEST':closeToAligned&&visibleCount>=25?'BETTER':mostlyAligned&&visibleCount>=21?'GOOD':'GOOD';
    const tips={
      BAD:'Adjust your position: bring your body into the frame and gently line up your shoulders over your hips.',
      GOOD:'Good placement. Your main body points are visible; make a small centering adjustment.',
      BETTER:'Better placement. Your torso is nearly centered and your body is clearly visible.',
      BEST:'Best placement. Your body is clearly in frame and your shoulder and hip centers are closely aligned.'
    };
    reportPlacement(tier,tips[tier]);
    if(mode.value==='center'){
      setVerdict(tier==='BEST'?'Best placement':tier==='BETTER'?'Better placement':tier==='GOOD'?'Good placement':'Adjust your placement',tips[tier],tier==='BAD'?'adjust':'good');
    }else if(mode.value==='arms'){
      const armsVisible=[13,14,15,16].every(i=>(l[i].visibility??1)>.18);
      setVerdict(armsVisible?'Arms in view':'Bring arms into frame',armsVisible?tips[tier]:'Bring both elbows and wrists into the camera frame.',armsVisible?'good':'adjust');
    }else{
      setVerdict(tier==='BEST'?'Best placement':tier==='BETTER'?'Better placement':tier==='GOOD'?'Good placement':'Adjust your placement',tips[tier],tier==='BAD'?'adjust':'good');
    }
  }
  function reportPlacement(tier,tip){
    if(tier===lastPlacementTier)return;
    lastPlacementTier=tier;
    if(typeof window.seokWooLivePlacementUpdate==='function'){
      try{window.seokWooLivePlacementUpdate({tier,tip});}catch(error){feedback.textContent='Placement found; Seok Woo connection error: '+(error?.message||'unknown error');}
    }else{
      window.dispatchEvent(new CustomEvent('seokwoo:live-placement',{detail:{tier,tip}}));
      feedback.textContent='Placement: '+tier+'. '+tip+' Open Seok Woo if you want more coaching.';
    }
  }
  window.seokWooLivePlacementSpeak=(message)=>{
    if(!voiceEnabled||!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return false;
    try{window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.rate=1.02;window.speechSynthesis.speak(utterance);return true;}catch(_){return false;}
  };
  if(voiceButton){
    voiceButton.addEventListener('click',()=>{
      voiceEnabled=!voiceEnabled;
      voiceButton.setAttribute('aria-pressed',String(voiceEnabled));
      voiceButton.textContent=voiceEnabled?'Seok Woo voice: on':'Enable Seok Woo voice';
      if(voiceEnabled){
        const ok=window.seokWooLivePlacementSpeak('Seok Woo voice feedback is on.');
        feedback.textContent=ok?'Seok Woo voice feedback is on. I will announce placement changes.':'Voice playback is unavailable in this browser.';
      }else{
        if('speechSynthesis' in window)window.speechSynthesis.cancel();
        feedback.textContent='Seok Woo voice feedback is off. Placement grades will still appear on screen.';
      }
    });
  }
  async function loadTracker(){
    if(landmarker)return true;if(loading)return false;loading=true;
    try{
      feedback.textContent='Loading body-tracking model…';
      const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
      const files=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      landmarker=await vision.PoseLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'CPU'},
        runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:DETECTION_CONFIDENCE,minPosePresenceConfidence:PRESENCE_CONFIDENCE,minTrackingConfidence:TRACKING_CONFIDENCE
      });
      return true;
    }catch(e){
      feedback.textContent='Body-tracking model failed to load: '+(e?.message||'unknown error')+'. Check your connection and restart the camera.';
      return false;
    }finally{loading=false;}
  }
  function trackFrame(){
    if(!trackingActive){return;}if(video.readyState<2||video.paused){raf=requestAnimationFrame(trackFrame);return;}
    const now=performance.now();
    if(now-lastDetectAt>=16){
      lastDetectAt=now;
      try{
        const result=landmarker.detectForVideo(video,now);
        if(result.landmarks&&result.landmarks[0]){
          drawPose(result.landmarks[0]);
        }else{
          ctx.clearRect(0,0,stage.clientWidth,stage.clientHeight);
          setVerdict('No body detected yet','Move back so your upper body is clearly in frame, face the camera and use steady lighting.','adjust');
          feedback.textContent='Camera is live; waiting for the pose model to detect a person.';
        }
      }catch(e){
        setVerdict('Tracking paused','Pose detection encountered an error. Stop and restart the camera.','adjust');
        feedback.textContent='Pose detection error: '+(e?.message||'unknown error');
      }
    }
    raf=requestAnimationFrame(trackFrame);
  }
  function stopCamera(message='Camera stopped. Live tracking ends and nothing is recorded or uploaded.'){
    lastPlacementTier='';trackingActive=false;video.pause();
    if(raf)cancelAnimationFrame(raf);raf=0;
    if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;if(uploadedVideoUrl){URL.revokeObjectURL(uploadedVideoUrl);uploadedVideoUrl=null;}video.removeAttribute('src');video.controls=false;video.load();stage.classList.remove('is-active');
    start.disabled=false;stop.disabled=true;status.textContent='CAMERA OFF';status.classList.remove('is-live');
    ctx.clearRect(0,0,canvas.width,canvas.height);setVerdict('Tracking off','Start the camera to track your movement.');feedback.textContent=message;
  }
  start.addEventListener('click',async()=>{
    if(!navigator.mediaDevices?.getUserMedia){feedback.textContent='Camera access needs a modern browser over HTTPS.';return;}
    start.disabled=true;feedback.textContent='Requesting camera permission…';
    try{
      const ok=await loadTracker();if(!ok){start.disabled=false;return;}
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:60,max:60}},audio:false});
      video.srcObject=stream;video.controls=false;await video.play();trackingActive=true;sizeCanvas();stage.classList.add('is-active');stop.disabled=false;
      status.textContent='BODY TRACKING LIVE';status.classList.add('is-live');
      feedback.textContent='Live body tracking is on. Keep your full body in frame; movement lines follow your joints.';
      setVerdict('Finding your body','Step back until your full body is visible.');lastVideoTime=-1;lastDetectAt=0;raf=requestAnimationFrame(trackFrame);
    }catch(e){stopCamera(e?.name==='NotAllowedError'?'Camera permission was not granted. Allow it in your browser site settings.':'Could not start the camera. Check that it is available and try again.');}
  });
  const uploadInput=document.getElementById('live-line-upload');
  if(uploadInput){
    uploadInput.addEventListener('change',async()=>{
      const file=uploadInput.files&&uploadInput.files[0];if(!file)return;
      stopCamera('Loading your video for live line tracking…');
      const ok=await loadTracker();if(!ok)return;
      uploadedVideoUrl=URL.createObjectURL(file);video.src=uploadedVideoUrl;video.srcObject=null;video.controls=true;
      try{
        await video.play();trackingActive=true;stage.classList.add('is-active');sizeCanvas();
        status.textContent='VIDEO TRACKING LIVE';status.classList.add('is-live');stop.disabled=false;start.disabled=false;
        feedback.textContent='Uploaded video is playing. Pose lines track the visible movement in this browser.';
        setVerdict('Finding your body','Play the video and keep the dancer visible in the frame.');
        lastDetectAt=0;raf=requestAnimationFrame(trackFrame);
      }catch(error){
        feedback.textContent='Could not play this video. Try an MP4, MOV or WEBM file.';
        video.controls=true;stage.classList.add('is-active');status.textContent='VIDEO READY';status.classList.remove('is-live');
      }
    });
  }
  if(referenceInput){
    referenceInput.addEventListener('change',()=>{
      const file=referenceInput.files&&referenceInput.files[0];if(!file)return;
      if(referenceVideoUrl)URL.revokeObjectURL(referenceVideoUrl);
      referenceVideoUrl=URL.createObjectURL(file);referenceVideo.src=referenceVideoUrl;referenceVideo.controls=true;referenceVideo.hidden=false;referenceVideo.loop=true;
      referenceVideo.load();
      matchOutput.textContent='Ready';
      compareDetail.textContent='Reference loaded. Start your camera or play your uploaded dance video to compare poses.';
      referenceVideo.play().catch(()=>{compareDetail.textContent='Reference loaded. Press play on the reference video, then start your camera.';});
    });
  }
  video.addEventListener('play',()=>{
    if(uploadedVideoUrl&&landmarker&&!trackingActive){
      trackingActive=true;lastDetectAt=0;raf=requestAnimationFrame(trackFrame);
    }
  });
  stop.addEventListener('click',()=>stopCamera());
  mode.addEventListener('change',()=>{guides.className='live-line-guides guide-'+mode.value;setVerdict('Mode changed','Move naturally and follow the live joint lines.');});
  mirror.addEventListener('click',()=>{mirrorOn=!mirrorOn;mirror.setAttribute('aria-pressed',String(mirrorOn));mirror.textContent='Mirror: '+(mirrorOn?'on':'off');stage.classList.toggle('is-mirrored',mirrorOn);});
  window.addEventListener('resize',sizeCanvas);
  window.addEventListener('pagehide',()=>stopCamera('Camera stopped when you left this page.'));
  stage.classList.add('is-mirrored');sizeCanvas();
})();