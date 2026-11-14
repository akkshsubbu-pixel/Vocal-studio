(() => {
  const video=document.getElementById('live-line-video'),stage=document.getElementById('live-line-stage');
  if(!video||!stage)return;
  const start=document.getElementById('live-line-start'),stop=document.getElementById('live-line-stop');
  const mode=document.getElementById('live-line-mode'),mirror=document.getElementById('live-line-mirror');
  const guides=document.getElementById('live-line-guides'),status=document.getElementById('live-line-status');
  const feedback=document.getElementById('live-line-feedback'),canvas=document.getElementById('live-line-pose');
  const ctx=canvas.getContext('2d');
  const verdict=document.getElementById('live-line-verdict'),detail=document.getElementById('live-line-detail');
  let stream=null,landmarker=null,raf=0,lastVideoTime=-1,loading=false,mirrorOn=true,lastDetectAt=0;
  const connections=[[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]];
  function setVerdict(title,description,state='neutral'){verdict.textContent=title;detail.textContent=description;verdict.dataset.state=state;}
  function sizeCanvas(){const r=stage.getBoundingClientRect();const d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);}
  function drawPose(landmarks){
    const w=stage.clientWidth,h=stage.clientHeight;ctx.clearRect(0,0,w,h);
    const vw=video.videoWidth||w,vh=video.videoHeight||h;
    const scale=Math.max(w/vw,h/vh),renderW=vw*scale,renderH=vh*scale;
    const cropX=(w-renderW)/2,cropY=(h-renderH)/2;
    const point=p=>({x:(mirrorOn?1-p.x:p.x)*renderW+cropX,y:p.y*renderH+cropY,visible:(p.visibility??1)>.15});
    ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#ff78a9';ctx.shadowColor='#ff78a9';ctx.shadowBlur=8;
    connections.forEach(([a,b])=>{const p=point(landmarks[a]),q=point(landmarks[b]);if(!p.visible||!q.visible)return;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();});
    ctx.shadowBlur=0;
    landmarks.forEach((lm,i)=>{const p=point(lm);if(!p.visible)return;ctx.beginPath();ctx.arc(p.x,p.y,i>=15&&i<=22?5:4,0,Math.PI*2);ctx.fillStyle=(i>=15&&i<=22)?'#ffe4ed':'#fff';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#b51e4e';ctx.stroke();});
    const shown=landmarks.filter(p=>(p.visibility??1)>.15).length;
    feedback.textContent='Body detected · '+shown+' of 33 tracking points visible. Move naturally and watch the pink lines follow.';
    assess(landmarks);
  }
  function assess(l){
    const visible=[11,12,23,24].every(i=>(l[i].visibility??1)>.25);
    if(!visible){setVerdict('Finding your body','Keep your shoulders and hips visible, face the camera and improve the lighting.');return;}
    const shoulderMid=(l[11].x+l[12].x)/2,hipMid=(l[23].x+l[24].x)/2;
    const centerOffset=Math.abs(shoulderMid-hipMid);
    const shoulderTilt=Math.abs(l[11].y-l[12].y);
    const hipTilt=Math.abs(l[23].y-l[24].y);
    if(mode.value==='center'){
      const ok=centerOffset<.10&&shoulderTilt<.09&&hipTilt<.10;
      setVerdict(ok?'On target':'Needs a small adjustment',ok?'Your shoulder and hip centers are tracking close in this front-facing view.':'Try a comfortable front-facing stance and let your shoulder and hip centers settle. ',ok?'good':'adjust');
    }else if(mode.value==='arms'){
      const elbows=[13,14],wrists=[15,16];
      const raised=elbows.every(i=>Math.abs(l[i].y-l[11+(i===13?0:1)].y)<.25)&&wrists.every(i=>(l[i].visibility??1)>.5);
      setVerdict(raised?'Arms tracked':'Keep both arms in view',raised?'Your arm landmarks are visible; compare the live pathways with your chosen shape.':'Bring your hands and elbows into the camera frame. This mode tracks visibility, not a single ideal arm shape.',raised?'good':'adjust');
    }else{
      setVerdict('Body tracking live','Follow the moving joint lines. For this movement, compare the path with your chosen dance reference; the app cannot label every style-specific shape as right or wrong.','neutral');
    }
  }
  async function loadTracker(){
    if(landmarker)return true;if(loading)return false;loading=true;
    try{
      feedback.textContent='Loading body-tracking model…';
      const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
      const files=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      landmarker=await vision.PoseLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'CPU'},
        runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.35,minPosePresenceConfidence:.35,minTrackingConfidence:.35
      });
      return true;
    }catch(e){
      feedback.textContent='Body-tracking model failed to load: '+(e?.message||'unknown error')+'. Check your connection and restart the camera.';
      return false;
    }finally{loading=false;}
  }
  function trackFrame(){
    if(!stream||video.readyState<2){raf=requestAnimationFrame(trackFrame);return;}
    const now=performance.now();
    if(now-lastDetectAt>=33){
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
    if(raf)cancelAnimationFrame(raf);raf=0;
    if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;stage.classList.remove('is-active');
    start.disabled=false;stop.disabled=true;status.textContent='CAMERA OFF';status.classList.remove('is-live');
    ctx.clearRect(0,0,canvas.width,canvas.height);setVerdict('Tracking off','Start the camera to track your movement.');feedback.textContent=message;
  }
  start.addEventListener('click',async()=>{
    if(!navigator.mediaDevices?.getUserMedia){feedback.textContent='Camera access needs a modern browser over HTTPS.';return;}
    start.disabled=true;feedback.textContent='Requesting camera permission…';
    try{
      const ok=await loadTracker();if(!ok){start.disabled=false;return;}
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
      video.srcObject=stream;await video.play();sizeCanvas();stage.classList.add('is-active');stop.disabled=false;
      status.textContent='BODY TRACKING LIVE';status.classList.add('is-live');
      feedback.textContent='Live body tracking is on. Keep your full body in frame; movement lines follow your joints.';
      setVerdict('Finding your body','Step back until your full body is visible.');lastVideoTime=-1;lastDetectAt=0;raf=requestAnimationFrame(trackFrame);
    }catch(e){stopCamera(e?.name==='NotAllowedError'?'Camera permission was not granted. Allow it in your browser site settings.':'Could not start the camera. Check that it is available and try again.');}
  });
  stop.addEventListener('click',()=>stopCamera());
  mode.addEventListener('change',()=>{guides.className='live-line-guides guide-'+mode.value;setVerdict('Mode changed','Move naturally and follow the live joint lines.');});
  mirror.addEventListener('click',()=>{mirrorOn=!mirrorOn;mirror.setAttribute('aria-pressed',String(mirrorOn));mirror.textContent='Mirror: '+(mirrorOn?'on':'off');stage.classList.toggle('is-mirrored',mirrorOn);});
  window.addEventListener('resize',sizeCanvas);
  window.addEventListener('pagehide',()=>stopCamera('Camera stopped when you left this page.'));
  stage.classList.add('is-mirrored');sizeCanvas();
})();