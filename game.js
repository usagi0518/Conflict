const ROWS = 6;
const COLS = 8;

const unitDefs = {
  pawn: { cost: 2, hp: 14, atk: 3, speed: 1 },
  knight: { cost: 4, hp: 24, atk: 5, speed: 1 },
  bishop: { cost: 5, hp: 12, atk: 7, speed: 1 },
  rook: { cost: 6, hp: 34, atk: 4, speed: 0.5 }
};

const cast = {
  schwarz: { name: "シュヴァルツ・クロノワール", quote: "俺はそういうの嫌いなんだよ。", meta: ["20歳/男", "黒陣営の王", "大剣/炎"], profile: "冷酷な実力主義者。失った盟友への喪失感を隠しながら勝利に執着する。" },
  blanc: { name: "ブラン・ウィットゥヴァイス", quote: "えー？そうなんだー？すごいねキミ、尊敬しちゃう！", meta: ["20歳/男", "白陣営の王", "レイピア/氷"], profile: "無邪気さを装う皮肉屋。言葉遊びで相手を翻弄し、感情を揺さぶる。" },
  grey: { name: "グレイ・ラーウスハイ", quote: "……壊してあげる。この醜い、不完全な盤面のすべてを", meta: ["18歳/女", "中立の審判", "均衡管理"], profile: "ルール崩壊に絶望した観測者。世界の初期化を正義と信じ暴走する。" },
  zell: { name: "ツェル・ダミエ", quote: "フハハハ！我は待ちかねたぞ、この時を！", meta: ["15歳/男", "魔王候補", "魔法銃/影・銀河"], profile: "盤面を実験場とする天才。傲慢さの奥に孤独と生存本能を抱える。" },
  stellamarie: { name: "ステラマリー・リュミエール", quote: "行って、テディ！ぜーんぶ蹴散らしちゃえ！", meta: ["15歳/女", "人形術師", "火属性"], profile: "明るさと狂気を併せ持つ支援者。敵を壊れやすい人形として見ている。" },
  astel: { name: "アステル・ノーラック", quote: "独りぼっちを見過ごせるわけないじゃないか！", meta: ["18歳/男", "自称勇者", "槍/聖"], profile: "臆病だが優しい槍使い。孤独な魔王を救うため戦う。" }
};

const stages = [
  { id: "T1", title: "白と黒の境界", desc: "基本召喚とマナを学ぶチュートリアル。", enemyHp: 70, manaRate: 1, enemyRate: 5, skill: "meteor" },
  { id: "S10", title: "魔界からの侵略者", desc: "ツェルが盤面に侵攻。敵の湧きが激化する。", enemyHp: 110, manaRate: 1, enemyRate: 3, skill: "meteor" },
  { id: "S20", title: "屈辱の同盟", desc: "双王が共闘。凍結スキルが解放される。", enemyHp: 140, manaRate: 2, enemyRate: 3, skill: "freeze" },
  { id: "S30", title: "エラー・コード：グレイ", desc: "グレイ暴走。崩壊タイルが出現する。", enemyHp: 180, manaRate: 2, enemyRate: 2, skill: "collapse" }
];

const state = { stageIndex: 0, mana: 0, allyHp: 100, enemyHp: 70, selectedUnit: "pawn", allyUnits: [], enemyUnits: [], skillCooldown: 0, tick: 0, gameOver: false, blocked: new Set() };
const el = {
  grid: document.getElementById("grid"), mana: document.getElementById("mana"), allyHp: document.getElementById("allyHp"), enemyHp: document.getElementById("enemyHp"), selectedCost: document.getElementById("selectedCost"), message: document.getElementById("message"), skillBtn: document.getElementById("skillBtn"), stageNo: document.getElementById("stageNo"), stageTitle: document.getElementById("stageTitle"), stageDesc: document.getElementById("stageDesc"), nextStageBtn: document.getElementById("nextStageBtn"), characterSelect: document.getElementById("characterSelect"), charQuote: document.getElementById("charQuote"), charMeta: document.getElementById("charMeta"), charProfile: document.getElementById("charProfile")
};

function getStage() { return stages[state.stageIndex]; }
function posKey(r, c) { return `${r},${c}`; }

function initCodex() {
  Object.entries(cast).forEach(([id, c]) => { const o = document.createElement("option"); o.value = id; o.textContent = c.name; el.characterSelect.append(o); });
  el.characterSelect.addEventListener("change", () => renderCharacter(el.characterSelect.value));
  renderCharacter("schwarz");
}
function renderCharacter(id) {
  const c = cast[id];
  el.charQuote.textContent = `「${c.quote}」`;
  el.charMeta.innerHTML = c.meta.map((x) => `<li>${x}</li>`).join("");
  el.charProfile.textContent = c.profile;
}
function makeGrid() { for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++){ const cell=document.createElement("button"); cell.className="cell"; if(c<3) cell.classList.add("ally-zone"); cell.dataset.row=r; cell.dataset.col=c; cell.addEventListener("click",()=>summonUnit(r,c)); el.grid.append(cell);} }
function summonUnit(row,col){ if(state.gameOver||col>2||state.blocked.has(posKey(row,col))) return; if(getUnitAt(state.allyUnits,row,col)) return; const def=unitDefs[state.selectedUnit]; if(state.mana<def.cost) return setMessage("マナ不足。"); state.mana-=def.cost; state.allyUnits.push({...def,type:state.selectedUnit,row,col,team:"ally",moveTick:0}); render(); }
function spawnEnemy(){ const row=Math.floor(Math.random()*ROWS); const types=["pawn","pawn","knight","bishop"]; const type=types[Math.floor(Math.random()*types.length)]; if(getUnitAt(state.enemyUnits,row,COLS-1)||state.blocked.has(posKey(row,COLS-1))) return; state.enemyUnits.push({...unitDefs[type],type,row,col:COLS-1,team:"enemy",moveTick:0}); }
function moveAndFight(units,opponents,direction){ for(const u of units){ u.moveTick += u.speed; if(u.moveTick<1) continue; u.moveTick=0; const next=u.col+direction; if(state.blocked.has(posKey(u.row,next))) continue; const t=getUnitAt(opponents,u.row,next); if(t){ t.hp-=u.atk; continue; } if(next>=0&&next<COLS) u.col=next; }}
function damageKings(){ for(const u of state.allyUnits){ if(u.col===COLS-1){ state.enemyHp-=u.atk; u.hp=0; }} for(const u of state.enemyUnits){ if(u.col===0){ state.allyHp-=u.atk; u.hp=0; }} }
function cleanup(){ state.allyUnits=state.allyUnits.filter(u=>u.hp>0); state.enemyUnits=state.enemyUnits.filter(u=>u.hp>0); }
function getUnitAt(list,row,col){ return list.find(u=>u.row===row&&u.col===col); }
function setMessage(msg){ el.message.textContent=msg; }

function useSkill(){ if(state.skillCooldown>0||state.gameOver) return; const stage=getStage(); state.skillCooldown=12;
  if(stage.skill==="meteor"){ const r1=Math.floor(Math.random()*ROWS); for(const e of state.enemyUnits) if(e.row===r1) e.hp-=12; setMessage("大剣・断罪/Meteor 発動！"); }
  if(stage.skill==="freeze"){ for(const e of state.enemyUnits) e.moveTick -= 0.8; setMessage("白昼夢の喝采：敵の進軍停止"); }
  if(stage.skill==="collapse"){ state.blocked.clear(); for(let i=0;i<4;i++){ state.blocked.add(posKey(Math.floor(Math.random()*ROWS), 2+Math.floor(Math.random()*4))); } setMessage("グリッド・崩壊：通行不能マス発生"); }
}

function render(){ const stage=getStage(); el.mana.textContent=state.mana; el.allyHp.textContent=Math.max(0,state.allyHp); el.enemyHp.textContent=Math.max(0,state.enemyHp); el.stageNo.textContent=stage.id; el.stageTitle.textContent=stage.title; el.stageDesc.textContent=stage.desc; el.selectedCost.textContent=unitDefs[state.selectedUnit].cost; el.skillBtn.textContent=state.skillCooldown>0?`King Skill (${state.skillCooldown})`:`King Skill`;
  for(const cell of el.grid.children){ const r=Number(cell.dataset.row), c=Number(cell.dataset.col); cell.innerHTML=""; cell.classList.toggle("blocked", state.blocked.has(posKey(r,c))); }
  [...state.allyUnits,...state.enemyUnits].forEach(u=>{ const cell=el.grid.children[u.row*COLS+u.col]; if(!cell) return; const n=document.createElement("div"); n.className=`unit ${u.type} ${u.team}`; cell.append(n); });
}

function gameTick(){ if(state.gameOver) return; const stage=getStage(); state.tick++; state.mana=Math.min(30,state.mana+stage.manaRate); if(state.tick%stage.enemyRate===0) spawnEnemy(); if(state.skillCooldown>0) state.skillCooldown--; moveAndFight(state.allyUnits,state.enemyUnits,1); moveAndFight(state.enemyUnits,state.allyUnits,-1); damageKings(); cleanup(); if(state.enemyHp<=0||state.allyHp<=0){ state.gameOver=true; setMessage(state.enemyHp<=0?"勝利。次のステージへ進める。":"敗北。次のステージで再挑戦。"); } render(); }

function nextStage(){ state.stageIndex=(state.stageIndex+1)%stages.length; const s=getStage(); state.enemyHp=s.enemyHp; state.allyHp=100; state.mana=0; state.allyUnits=[]; state.enemyUnits=[]; state.skillCooldown=0; state.tick=0; state.gameOver=false; state.blocked.clear(); setMessage(`Stage ${s.id} 開始`); render(); }

document.querySelectorAll(".unit-btn").forEach((btn)=>btn.addEventListener("click",()=>{ document.querySelectorAll(".unit-btn").forEach((b)=>b.classList.remove("active")); btn.classList.add("active"); state.selectedUnit=btn.dataset.unit; render(); }));
el.skillBtn.addEventListener("click",useSkill);
el.nextStageBtn.addEventListener("click",nextStage);

makeGrid(); initCodex(); nextStage(); setInterval(gameTick,1000);
