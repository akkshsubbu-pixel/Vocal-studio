(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VocalRewards=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MILESTONES=[
    {days:3,label:'3-day streak',cards:1},
    {days:7,label:'7-day streak',cards:2},
    {days:14,label:'14-day streak',rarity:'Rare'},
    {days:30,label:'30-day streak',rarity:'Epic'},
    {days:60,label:'60-day streak',rarity:'Exclusive'},
    {days:100,label:'100-day streak',rarity:'Legendary'},
    {days:365,label:'365-day streak',rarity:'Hall of Fame'}
  ];
  const RARITY_WEIGHTS=[['Common',.60],['Rare',.25],['Epic',.12],['Legendary',.03]];
  const REWARDS={
    Common:[
      {name:'Pocket Star Coins',description:'A little sparkle for showing up. +10 Star Coins.'},
      {name:'Practice Spark',description:'A bright reminder of today’s practice. +20 Star Coins.'},
      {name:'Warm-Up Glow',description:'A cheerful studio accent for your next visit.'}
    ],
    Rare:[
      {name:'Silver Spotlight',description:'A polished badge for your artist collection.'},
      {name:'Moonlit Stage',description:'A cool, night-sky visualiser theme.'},
      {name:'Studio Bloom',description:'A soft floral recording studio background.'}
    ],
    Epic:[
      {name:'Velvet Night',description:'An elegant deep-violet visualiser theme.'},
      {name:'Golden Hour Studio',description:'A warm sunset recording studio background.'},
      {name:'Vocal Virtuoso',description:'An exclusive artist title for your collection.'}
    ],
    Legendary:[
      {name:'Celestial Headliner',description:'A radiant badge for a remarkable practice journey.'},
      {name:'Hall of Sound',description:'A legendary artist title, earned through practice.'}
    ],
    Exclusive:[{name:'Sixty-Day Spotlight',description:'An exclusive badge for sixty consecutive practice days.'}],
    'Hall of Fame':[{name:'Hall of Fame',description:'A lasting badge honoring a full year of practice.'}]
  };
  function emptyState(){return{practiceDates:[],longestStreak:0,claimedMilestones:[],cards:[],collection:[],starCoins:0,sequence:0}}
  function normalizeState(input){const s={...emptyState(),...(input||{})};for(const k of ['practiceDates','claimedMilestones','cards','collection'])if(!Array.isArray(s[k]))s[k]=[];s.practiceDates=[...new Set(s.practiceDates.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))].sort();s.longestStreak=Math.max(0,Number(s.longestStreak)||0);s.starCoins=Math.max(0,Number(s.starCoins)||0);s.sequence=Math.max(0,Number(s.sequence)||0);return s}
  function dateKey(date=new Date()){if(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date))return date;const d=date instanceof Date?date:new Date(date);if(Number.isNaN(d.getTime()))throw new TypeError('Practice date is invalid');return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function shiftDate(key,amount){const [y,m,d]=key.split('-').map(Number),next=new Date(y,m-1,d+amount,12);return dateKey(next)}
  function streakStats(dates,today=new Date(),longestFloor=0){const keys=[...new Set((dates||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))].sort(),todayKey=dateKey(today),yesterday=shiftDate(todayKey,-1),set=new Set(keys);let longest=0,run=0,prev=null;for(const key of keys){run=prev&&shiftDate(prev,1)===key?run+1:1;longest=Math.max(longest,run);prev=key}let current=0,last=set.has(todayKey)?todayKey:set.has(yesterday)?yesterday:null;if(last){current=1;while(set.has(shiftDate(last,-1))){last=shiftDate(last,-1);current++}}const nextMilestone=MILESTONES.find(m=>m.days>current)||null;return{current,longest:Math.max(longestFloor,longest),nextMilestone,lastPracticeDate:keys.at(-1)||null,today:todayKey,completedDates:keys}}
  function nextId(s,prefix,key){s.sequence++;return`${prefix}-${key}-${s.sequence}`}
  function selectReward(rarity,random=Math.random){const pool=REWARDS[rarity];if(!pool?.length)throw new Error('Unknown reward rarity: '+rarity);const index=Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(.999999999,random()))*pool.length));return{...pool[index],rarity}}
  function milestoneReward(s,m,key,random){if(m.cards){for(let n=0;n<m.cards;n++)s.cards.push({id:nextId(s,'scratch',key),earnedAt:key,milestone:m.days,status:'pending',rewardId:null});return{type:'cards',count:m.cards,milestone:m.days}}const reward=selectReward(m.rarity,random);const entry={...reward,id:nextId(s,'reward',key),source:'milestone',milestone:m.days,earnedAt:key};s.collection.unshift(entry);addCoins(s,entry);return{type:'reward',reward:entry,milestone:m.days}}
  function addCoins(s,reward){const match=reward.description.match(/\+(\d+) Star Coins/);if(match)s.starCoins+=Number(match[1])}
  function recordPractice(input,date=new Date(),random=Math.random){const s=normalizeState(input),key=dateKey(date);if(s.practiceDates.includes(key))return{state:s,duplicate:true,stats:streakStats(s.practiceDates,key,s.longestStreak),awards:[]};s.practiceDates.push(key);s.practiceDates.sort();const stats=streakStats(s.practiceDates,key,s.longestStreak);s.longestStreak=Math.max(s.longestStreak,stats.longest);const awards=[];for(const m of MILESTONES){if(stats.current===m.days&&!s.claimedMilestones.includes(m.days)){s.claimedMilestones.push(m.days);awards.push(milestoneReward(s,m,key,random))}}return{state:s,duplicate:false,stats:streakStats(s.practiceDates,key,s.longestStreak),awards}}
  function drawTier(random=Math.random){const n=Math.max(0,Math.min(.999999999,random()));let sum=0;for(const [rarity,weight] of RARITY_WEIGHTS){sum+=weight;if(n<sum)return rarity}return'Legendary'}
  function scratchCard(input,cardId,random=Math.random){const s=normalizeState(input),card=s.cards.find(x=>x.id===cardId);if(!card||card.status!=='pending')return{state:s,reward:null,duplicate:true};const rarity=drawTier(random),reward=selectReward(rarity,random),key=card.earnedAt||dateKey(new Date()),entry={...reward,id:nextId(s,'reward',key),source:'scratch-card',cardId,earnedAt:dateKey(new Date())};card.status='scratched';card.rewardId=entry.id;s.collection.unshift(entry);addCoins(s,entry);return{state:s,reward:entry,duplicate:false}}
  return{MILESTONES,RARITY_WEIGHTS,REWARDS,emptyState,normalizeState,dateKey,shiftDate,streakStats,recordPractice,drawTier,selectReward,scratchCard};
});
