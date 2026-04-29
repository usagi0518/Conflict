import { CAST, STAGES, TIMELINE, ENDINGS } from './game-data.js';

const ROWS = 6, COLS = 8;
const unitDefs = { pawn:{cost:2,hp:14,atk:3,speed:1}, knight:{cost:4,hp:24,atk:5,speed:1}, bishop:{cost:5,hp:12,atk:7,speed:1}, rook:{cost:6,hp:30,atk:4,speed:0.5}, queen:{cost:9,hp:30,atk:11,speed:1.2} };
const growth = Object.fromEntries(CAST.map(c=>[c.id,{level:1,exp:0,idea:0,resonance:0}]));
const state = { stageIndex:0,mana:0,allyHp:100,enemyHp:100,selectedUnit:'pawn',allyUnits:[],enemyUnits:[],cooldown:0,tick:0,gameOver:false,effects:{freeze:0,fear:0,bind:0},clearCount:0,endingBias:{order:0,chaos:0,bond:0} };
const ids=['grid','mana','stageNo','stageTitle','stagePart','message','skillBtn','nextStageBtn','characterSelect','charQuote','charStats','charSkills','timeline','endings','stageList','growthChar','growthStats','feedExpBtn','unlockNodeBtn','growthMsg','simulateEndBtn','endingResult'];
const el = Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));

const stageConfig=()=>{ const s=STAGES[state.stageIndex%STAGES.length]; const n=Math.max(1,state.stageIndex); return { ...s, enemyHp:80+n*4, enemyRate:Math.max(2,5-Math.floor(n/10)), manaRate:1+Math.floor(n/20) }; };
const activeCast = () => CAST[state.stageIndex % CAST.length];
function makeGrid(){ for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ const b=document.createElement('button'); b.className='cell'; if(c<3)b.classList.add('ally-zone'); b.onclick=()=>summon(r,c); b.dataset.row=r; b.dataset.col=c; el.grid.append(b);} }
function summon(r,c){ if(c>2||state.gameOver||at(state.allyUnits,r,c)) return; const def=unitDefs[state.selectedUnit]; if(state.mana<def.cost) return msg('マナ不足'); state.mana-=def.cost; const unit={...def,type:state.selectedUnit,row:r,col:c,team:'ally',t:0,status:{fear:0,bind:0}}; if(activeCast().id==='schwarz' && state.allyHp<60) unit.atk += 2; state.allyUnits.push(unit); }
function spawnEnemy(){ const row=Math.floor(Math.random()*ROWS); const pool=['pawn','pawn','knight','bishop','rook','queen']; const type=pool[Math.floor(Math.random()*pool.length)]; if(at(state.enemyUnits,row,COLS-1)) return; state.enemyUnits.push({...unitDefs[type],type,row,col:COLS-1,team:'enemy',t:0,status:{fear:0,bind:0}}); }
const at=(list,r,c)=>list.find(u=>u.row===r&&u.col===c);
function applyStatusTick(units){ for(const u of units){ if(u.status.fear>0) u.status.fear--; if(u.status.bind>0) u.status.bind--; } }
function step(units,opp,dir){ for(const u of units){ if(u.status.bind>0) continue; u.t+=u.speed; if(u.t<1) continue; u.t=0; if(u.status.fear>0 && Math.random()<0.5) continue; const nc=u.col+dir; const target=at(opp,u.row,nc); if(target){ let dmg=u.atk; if(state.effects.fear>0 && u.team==='ally') dmg+=2; target.hp-=dmg; if(activeCast().id==='stellamarie' && u.team==='ally') target.status.bind=Math.max(target.status.bind,1); continue; } if(nc>=0&&nc<COLS) u.col=nc; }}
function damageKing(){ for(const u of state.allyUnits) if(u.col===COLS-1){ state.enemyHp-=u.atk; u.hp=0; } for(const u of state.enemyUnits) if(u.col===0){ state.allyHp-=u.atk; u.hp=0; } }
function clean(){ state.allyUnits=state.allyUnits.filter(u=>u.hp>0); state.enemyUnits=state.enemyUnits.filter(u=>u.hp>0); }
function castSkillEffects(){ const caster = activeCast().id; if(caster==='blanc'){ state.effects.freeze=3; state.endingBias.order += 1; msg('白昼夢の喝采：敵進軍停止'); }
  else if(caster==='grey'){ state.effects.fear=3; state.enemyUnits.forEach(u=>u.status.fear=2); state.endingBias.order += 2; msg('均衡の審判：敵に恐怖'); }
  else if(caster==='stellamarie'){ state.effects.bind=2; state.enemyUnits.slice(0,3).forEach(u=>u.status.bind=2); state.endingBias.chaos += 2; msg('ステッチ・バインド：敵拘束'); }
  else if(caster==='astel'){ state.allyHp=Math.min(100,state.allyHp+15); state.endingBias.bond += 2; msg('奇跡の聖盾：味方回復'); }
  else msg(`${activeCast().name}：${activeCast().active1}！`);
}
function skill(){ if(state.cooldown>0)return; state.cooldown=10; castSkillEffects(); for(const e of state.enemyUnits) e.hp-=6; }
const msg=t=>el.message.textContent=t;
function render(){ const s=stageConfig(); el.mana.textContent=state.mana; el.stageNo.textContent=s.id; el.stageTitle.textContent=s.title; el.stagePart.textContent=`${s.part}${s.boss?' / BOSS':''} - ${s.desc} / Clear:${state.clearCount} / Fx Fz:${state.effects.freeze} Fr:${state.effects.fear} Bd:${state.effects.bind}`; el.skillBtn.textContent=state.cooldown>0?`Skill(${state.cooldown})`:'Skill'; for(const cell of el.grid.children) cell.innerHTML=''; [...state.allyUnits,...state.enemyUnits].forEach(u=>{ const cell=el.grid.children[u.row*COLS+u.col]; if(!cell) return; const d=document.createElement('div'); d.className=`unit ${u.team}`; d.textContent=u.type[0].toUpperCase(); cell.append(d);}); renderStageList(); renderGrowth(); }
function tick(){ if(state.gameOver) return; const s=stageConfig(); state.tick++; state.mana=Math.min(40,state.mana+s.manaRate); if(state.tick%s.enemyRate===0) spawnEnemy(); if(state.cooldown>0) state.cooldown--; if(state.effects.freeze>0) state.effects.freeze--; if(state.effects.fear>0) state.effects.fear--; if(state.effects.bind>0) state.effects.bind--; applyStatusTick(state.allyUnits); applyStatusTick(state.enemyUnits); step(state.allyUnits,state.enemyUnits,1); if(state.effects.freeze===0) step(state.enemyUnits,state.allyUnits,-1); damageKing(); clean(); if(state.enemyHp<=0||state.allyHp<=0){ state.gameOver=true; if(state.enemyHp<=0){ state.clearCount++; state.endingBias.bond++; msg('勝利！Nextで進行'); rewardGrowth(15);} else msg('敗北…Nextで再戦'); } render(); }
function rewardGrowth(exp){ const id=el.growthChar.value || CAST[0].id; growth[id].exp += exp; levelUp(id); el.growthMsg.textContent=`${CAST.find(c=>c.id===id).name} がEXP +${exp}`; }
function levelUp(id){ while(growth[id].exp >= growth[id].level*20){ growth[id].exp -= growth[id].level*20; growth[id].level++; growth[id].resonance++; } }
function unlockIdea(id){ const cost=2; if(growth[id].resonance<cost){ el.growthMsg.textContent='共鳴値が不足'; return; } growth[id].resonance -= cost; growth[id].idea++; state.endingBias.order += 1; el.growthMsg.textContent='イデアノードを解放'; }
function renderGrowth(){ const id=el.growthChar.value || CAST[0].id; const g=growth[id]; el.growthStats.textContent=`Lv.${g.level} / EXP ${g.exp}/${g.level*20} / Idea ${g.idea} / Resonance ${g.resonance}`; }
function evaluateEnding(){ const {order,chaos,bond}=state.endingBias; const totalIdea = Object.values(growth).reduce((a,g)=>a+g.idea,0); let result='End A: 白黒の再創造'; if(order>=chaos+3 && totalIdea>=6) result='End B: 観測者の柩'; if(chaos>=order+3 || bond>=10) result='End C: 盤面越えの反逆'; el.endingResult.textContent=`判定結果: ${result} (order:${order} chaos:${chaos} bond:${bond} idea:${totalIdea})`; }
function setStage(index){ state.stageIndex=(index+STAGES.length)%STAGES.length; const s=stageConfig(); state.enemyHp=s.enemyHp; state.allyHp=100; state.mana=0; state.allyUnits=[]; state.enemyUnits=[]; state.cooldown=0; state.tick=0; state.gameOver=false; state.effects={freeze:0,fear:0,bind:0}; msg(`${s.id} ${s.title}`); render(); }
const nextStage=()=>setStage(state.stageIndex+1);
function renderStageList(){ el.stageList.innerHTML=''; STAGES.forEach((s,i)=>{ const b=document.createElement('button'); b.className='stage-chip'; if(i===state.stageIndex) b.classList.add('active'); b.textContent=`${s.id}`; b.onclick=()=>setStage(i); el.stageList.append(b);}); }
function initCodex(){ CAST.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; el.characterSelect.append(o); const g=document.createElement('option'); g.value=c.id; g.textContent=c.name; el.growthChar.append(g); }); el.characterSelect.onchange=()=>showChar(el.characterSelect.value); el.growthChar.onchange=renderGrowth; showChar(CAST[0].id); TIMELINE.forEach(([t,e])=>{ const li=document.createElement('li'); li.textContent=`${t}: ${e}`; el.timeline.append(li);}); ENDINGS.forEach((e)=>{ const li=document.createElement('li'); li.textContent=e; el.endings.append(li);}); }
function showChar(id){ const c=CAST.find(x=>x.id===id); el.charQuote.textContent=`「${c.quote}」`; el.charStats.textContent=Object.entries(c.stats).map(([k,v])=>`${k}: ${v}`).join('\n'); el.charSkills.textContent=`${c.role} / ${c.element}\nPassive: ${c.passive}\nActive: ${c.active1}・${c.active2}`; }

document.querySelectorAll('.unit-btn').forEach(b=>b.onclick=()=>{ document.querySelectorAll('.unit-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); state.selectedUnit=b.dataset.unit; });
el.skillBtn.onclick=skill; el.nextStageBtn.onclick=nextStage; el.feedExpBtn.onclick=()=>rewardGrowth(10); el.unlockNodeBtn.onclick=()=>unlockIdea(el.growthChar.value || CAST[0].id); el.simulateEndBtn.onclick=evaluateEnding;

makeGrid(); initCodex(); setStage(0); setInterval(tick,1000);

// merged-state: conflict resolution baseline
