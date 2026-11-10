const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('./rewards.js');

test('calendar dates use the local day, not the UTC date',()=>{
  const local=new Date(2025,0,2,23,55,0);
  assert.equal(R.dateKey(local),'2025-01-02');
  assert.equal(R.shiftDate('2025-03-09',1),'2025-03-10');
});

test('a day is counted once even when several sessions finish that day',()=>{
  const first=R.recordPractice(R.emptyState(),'2025-01-01',()=>0);
  const second=R.recordPractice(first.state,'2025-01-01',()=>0);
  assert.equal(first.duplicate,false);
  assert.equal(second.duplicate,true);
  assert.deepEqual(second.state.practiceDates,['2025-01-01']);
});

test('missed local calendar day resets current streak but preserves longest',()=>{
  const streak=R.streakStats(['2025-01-01','2025-01-02'],'2025-01-03');
  assert.equal(streak.current,2);
  const missed=R.streakStats(['2025-01-01','2025-01-02'],'2025-01-04');
  assert.equal(missed.current,0);
  assert.equal(missed.longest,2);
});

test('3-day and 7-day milestones grant the specified cards only once',()=>{
  let s=R.emptyState(),result;
  for(let day=1;day<=7;day++){result=R.recordPractice(s,`2025-02-${String(day).padStart(2,'0')}`,()=>0);s=result.state}
  assert.deepEqual(s.cards.map(c=>c.milestone),[3,7,7]);
  assert.deepEqual(s.claimedMilestones,[3,7]);
  result=R.recordPractice(s,'2025-02-08',()=>0);s=result.state;
  for(let day=1;day<=3;day++){result=R.recordPractice(s,`2025-02-${String(day+10).padStart(2,'0')}`,()=>0);s=result.state}
  assert.equal(s.cards.length,3);
});

test('higher milestones grant the specified reward tiers',()=>{
  let s=R.emptyState(),result;
  for(let day=1;day<=30;day++){result=R.recordPractice(s,`2025-04-${String(day).padStart(2,'0')}`,()=>0);s=result.state}
  assert.deepEqual(s.collection.map(r=>[r.milestone,r.rarity]).sort((a,b)=>a[0]-b[0]),[[14,'Rare'],[30,'Epic']]);
  assert.deepEqual(s.claimedMilestones,[3,7,14,30]);
});

test('60, 100 and 365 day milestones award their exclusive and hall of fame badges',()=>{
  let s=R.emptyState(),result;
  let day='2024-01-01';
  for(let i=0;i<365;i++){
    result=R.recordPractice(s,day,()=>0);
    s=result.state;
    day=R.shiftDate(day,1);
  }
  assert.deepEqual(s.collection.filter(r=>[60,100,365].includes(r.milestone)).map(r=>[r.milestone,r.rarity]).sort((a,b)=>a[0]-b[0]),[[60,'Exclusive'],[100,'Legendary'],[365,'Hall of Fame']]);
  assert.deepEqual(s.cards.map(c=>c.milestone),[3,7,7]);
  assert.equal(R.streakStats(s.practiceDates,day,s.longestStreak).current,365);
});

test('scratch rarity boundaries match the configured odds',()=>{
  assert.equal(R.drawTier(()=>0),'Common');
  assert.equal(R.drawTier(()=>.599999),'Common');
  assert.equal(R.drawTier(()=>.60),'Rare');
  assert.equal(R.drawTier(()=>.849999),'Rare');
  assert.equal(R.drawTier(()=>.85),'Epic');
  assert.equal(R.drawTier(()=>.969999),'Epic');
  assert.equal(R.drawTier(()=>.97),'Legendary');
  assert.equal(R.drawTier(()=>.999999),'Legendary');
});

test('a scratch card reveals and records exactly one collectible',()=>{
  let s=R.emptyState();
  s=R.recordPractice(s,'2025-05-01',()=>0).state;
  s=R.recordPractice(s,'2025-05-02',()=>0).state;
  s=R.recordPractice(s,'2025-05-03',()=>0).state;
  const card=s.cards[0];
  const reveal=R.scratchCard(s,card.id,()=>0);
  assert.equal(reveal.reward.rarity,'Common');
  assert.equal(reveal.state.collection.length,1);
  const repeated=R.scratchCard(reveal.state,card.id,()=>0);
  assert.equal(repeated.duplicate,true);
  assert.equal(repeated.state.collection.length,1);
});
