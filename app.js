(function(){
const DATA=window.CAREER_DATA||{applications:[],hc:[],watch:[],meta:{}};
const STATUSES=["候选待投","已投递","HR感兴趣","交换简历","已查看","筛选通过","笔试","面试","Offer","已拒绝Offer","不合适","停止招聘","无后续"];
const ARCHIVE=new Set(["已拒绝Offer","不合适","停止招聘","无后续"]);
const POSITIVE=new Set(["HR感兴趣","交换简历","已查看"]);
const STORAGE_PATCH="career-dashboard-patches-v2", STORAGE_EXTRA="career-dashboard-extra-v2";
let patches=read(STORAGE_PATCH,{}), extras=read(STORAGE_EXTRA,[]), currentId=null;

const $=id=>document.getElementById(id);
function read(k,fallback){try{const x=JSON.parse(localStorage.getItem(k));return x??fallback}catch(e){return fallback}}
function save(){localStorage.setItem(STORAGE_PATCH,JSON.stringify(patches));localStorage.setItem(STORAGE_EXTRA,JSON.stringify(extras))}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function uniq(a){return [...new Set(a.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'zh-CN'))}
function mergedApps(){
  const base=DATA.applications.map(x=>Object.assign({},x,patches[x.id]||{}));
  const extra=extras.map(x=>Object.assign({},x,patches[x.id]||{}));
  return [...base,...extra];
}
function setPatch(id,obj){patches[id]=Object.assign({},patches[id]||{},obj);save();renderAll()}
function statusClass(s){if(["Offer","面试","笔试","筛选通过"].includes(s))return"good";if(POSITIVE.has(s))return"warn";if(ARCHIVE.has(s))return"bad";return""}
function priClass(p){return (p||"C").toLowerCase()}
function latestDate(a){return [a.lastContact,a.applied].filter(Boolean).sort().reverse()[0]||""}
function isFormal(a){return a.employment!=="兼职"&&a.employment!=="实习"}
function isActive(a){return !ARCHIVE.has(a.status)}
function isCore(a){return a.core||["S","A"].includes(a.priority)}

function renderStats(){
  const all=mergedApps(), formal=all.filter(isFormal), active=formal.filter(isActive);
  const stats=[
    [formal.filter(x=>x.status!=="候选待投").length,"正式岗位记录"],
    [formal.filter(x=>POSITIVE.has(x.status)).length,"平台正向反馈"],
    [active.filter(isCore).length,"进行中高优先"],
    [formal.filter(x=>["笔试","面试"].includes(x.status)).length,"笔试 / 面试"],
    [formal.filter(x=>x.status==="Offer").length,"Offer"]
  ];
  $("stats").innerHTML=stats.map((s,i)=>`<div class="stat ${i===2?'emph':''}"><div class="n">${s[0]}</div><div class="l">${s[1]}</div></div>`).join("");
}
function renderFunnel(){
  const a=mergedApps().filter(x=>isFormal(x)&&!ARCHIVE.has(x.status));
  const count={
    "已投递":a.filter(x=>x.status!=="候选待投").length,
    "正向反馈/查看":a.filter(x=>POSITIVE.has(x.status)||["筛选通过","笔试","面试","Offer"].includes(x.status)).length,
    "筛选通过":a.filter(x=>["筛选通过","笔试","面试","Offer"].includes(x.status)).length,
    "笔试":a.filter(x=>["笔试","面试","Offer"].includes(x.status)).length,
    "面试":a.filter(x=>["面试","Offer"].includes(x.status)).length,
    "Offer":a.filter(x=>x.status==="Offer").length
  };
  $("funnel").innerHTML=Object.entries(count).map(([k,v])=>`<div class="stage"><b>${v}</b><span>${k}</span></div>`).join("");
}
function fillFilters(){
  const a=mergedApps();
  const fill=(el,vals)=>{const current=el.value;el.innerHTML=el.options[0].outerHTML+vals.map(v=>`<option>${esc(v)}</option>`).join("");el.value=current};
  fill($("cityFilter"),uniq(a.map(x=>x.city)));
  fill($("trackFilter"),uniq(a.map(x=>x.track)));
  fill($("statusFilter"),STATUSES);
}
function filteredApps(){
  let a=mergedApps().filter(x=>!ARCHIVE.has(x.status));
  const q=$("q").value.trim().toLowerCase(),city=$("cityFilter").value,track=$("trackFilter").value,status=$("statusFilter").value,pri=$("priorityFilter").value;
  if($("formalOnly").checked)a=a.filter(isFormal);
  if(q)a=a.filter(x=>[x.company,x.role,x.track,x.source,x.note].some(v=>String(v||"").toLowerCase().includes(q)));
  if(city)a=a.filter(x=>x.city===city);
  if(track)a=a.filter(x=>x.track===track);
  if(status)a=a.filter(x=>x.status===status);
  if(pri)a=a.filter(x=>x.priority===pri);
  return a.sort((x,y)=>{
    const p={S:0,A:1,B:2,C:3};
    return (p[x.priority]??9)-(p[y.priority]??9) || latestDate(y).localeCompare(latestDate(x));
  });
}
function renderApplications(){
  const rows=filteredApps();
  $("applicationRows").innerHTML=rows.map(a=>`<tr data-id="${esc(a.id)}">
    <td><span class="badge ${priClass(a.priority)}">${esc(a.priority)}</span>${a.core?'<br><span class="badge core" style="margin-top:4px">主线</span>':''}</td>
    <td class="company-cell"><b>${esc(a.company)}</b><span>${esc(a.role)}</span>${a.salary?`<div class="muted">${esc(a.salary)}</div>`:''}</td>
    <td>${esc(a.city||"—")}</td>
    <td>${esc(a.track||"—")}</td>
    <td>${esc(a.source||"—")}</td>
    <td><div>${a.applied?`投 ${esc(a.applied)}`:"—"}</div>${a.lastContact?`<div class="muted">互动 ${esc(a.lastContact)}</div>`:""}</td>
    <td><span class="badge ${statusClass(a.status)}">${esc(a.status)}</span></td>
    <td>${esc(a.next||"—")}</td>
  </tr>`).join("");
  $("applicationsEmpty").hidden=rows.length>0;
  document.querySelectorAll("#applicationRows tr").forEach(tr=>tr.onclick=()=>openJob(tr.dataset.id));
}
function renderFocus(){
  const a=mergedApps().filter(x=>isFormal(x)&&isActive(x)&&isCore(x)).sort((x,y)=>({S:0,A:1,B:2,C:3}[x.priority]??9)-({S:0,A:1,B:2,C:3}[y.priority]??9));
  $("focusCards").innerHTML=a.map(cardApp).join("")||'<div class="empty">暂无重点岗位。</div>';
  bindCardClicks("focusCards");
}
function cardApp(a){return `<article class="card" data-id="${esc(a.id)}"><div class="card-top"><div><h3>${esc(a.company)}</h3><div class="role">${esc(a.role)}</div></div><span class="badge ${priClass(a.priority)}">${esc(a.priority)}</span></div><div class="tag-row"><span class="badge ${statusClass(a.status)}">${esc(a.status)}</span>${a.core?'<span class="badge core">核心主线</span>':''}<span class="badge">${esc(a.city||"城市待补")}</span><span class="badge">${esc(a.track||"方向待补")}</span></div><div class="card-grid"><div><strong>匹配点</strong><br>${esc(a.match||"—")}</div><div><strong>风险</strong><br>${esc(a.risk||"—")}</div><div><strong>下一步</strong><br>${esc(a.next||"—")}</div><div><strong>最近信号</strong><br>${esc(latestDate(a)||"—")}</div></div></article>`}
function bindCardClicks(id){document.querySelectorAll(`#${id} .card[data-id]`).forEach(c=>c.onclick=()=>openJob(c.dataset.id))}
function renderArchive(){
  const a=mergedApps().filter(x=>ARCHIVE.has(x.status));
  $("archiveCards").innerHTML=a.map(cardApp).join("")||'<div class="empty">归档区为空。</div>';
  bindCardClicks("archiveCards");
}
function renderHC(){
  const now=new Date();
  $("hcCards").innerHTML=(DATA.hc||[]).map(h=>{
    let remain=""; if(h.deadline){const d=Math.ceil((new Date(h.deadline+"T23:59:59")-now)/86400000);remain=d<0?`已截止 ${Math.abs(d)} 天`:`剩余 ${d} 天`;}
    return `<article class="card"><div class="card-top"><div><h3>${esc(h.company)}</h3><div class="role">${esc(h.role)}</div></div><span class="badge ${priClass(h.priority)}">${esc(h.priority)}</span></div><div class="tag-row"><span class="badge">${esc(h.city)}</span><span class="badge">${esc(h.type)}</span><span class="badge ${h.status.includes('投')?'good':''}">${esc(h.status)}</span></div><div class="card-grid"><div><strong>发布时间</strong><br>${esc(h.published||"—")}</div><div><strong>截止</strong><br>${esc(h.deadline||"—")} ${remain?`· ${esc(remain)}`:""}</div><div><strong>匹配点</strong><br>${esc(h.match||"—")}</div><div><strong>风险</strong><br>${esc(h.risk||"—")}</div></div>${h.url?`<div class="card-actions"><a href="${esc(h.url)}" target="_blank" rel="noopener">打开招聘入口 ↗</a></div>`:""}</article>`
  }).join("");
}
function renderWatch(){
  $("watchRows").innerHTML=(DATA.watch||[]).map(w=>`<tr><td><b>${esc(w.company)}</b></td><td>${esc(w.city)}</td><td>${esc(w.type)}</td><td>${esc(w.why)}</td><td>${esc(w.targets)}</td></tr>`).join("");
}
function openJob(id){
  const a=mergedApps().find(x=>x.id===id);if(!a)return;currentId=id;$("dialogTitle").textContent="编辑岗位";
  const map={"f-id":"id","f-company":"company","f-role":"role","f-city":"city","f-salary":"salary","f-source":"source","f-recruitType":"recruitType","f-employment":"employment","f-track":"track","f-status":"status","f-priority":"priority","f-applied":"applied","f-lastContact":"lastContact","f-deadline":"deadline","f-match":"match","f-risk":"risk","f-next":"next","f-note":"note","f-url":"url"};
  Object.entries(map).forEach(([fid,k])=>$(fid).value=a[k]||"");$("f-core").checked=!!a.core;$("jobDialog").showModal();
}
function newJob(){
  currentId=null;$("dialogTitle").textContent="新增岗位";$("jobForm").reset();$("f-id").value="";$("f-status").value="候选待投";$("f-priority").value="B";$("f-employment").value="正式全职";$("jobDialog").showModal();
}
function formObj(){
  const id=currentId||`local-${Date.now()}`;
  return {id,company:$("f-company").value.trim(),role:$("f-role").value.trim(),city:$("f-city").value.trim(),salary:$("f-salary").value.trim(),source:$("f-source").value.trim(),recruitType:$("f-recruitType").value.trim(),employment:$("f-employment").value,track:$("f-track").value.trim(),status:$("f-status").value,priority:$("f-priority").value,applied:$("f-applied").value,lastContact:$("f-lastContact").value,deadline:$("f-deadline").value,core:$("f-core").checked,match:$("f-match").value.trim(),risk:$("f-risk").value.trim(),next:$("f-next").value.trim(),note:$("f-note").value.trim(),url:$("f-url").value.trim()};
}
function saveForm(){const o=formObj();if(!o.company||!o.role){alert("请至少填写公司和岗位。");return}if(currentId){setPatch(currentId,o)}else{extras.push(o);save();renderAll()}$("jobDialog").close()}
function archiveCurrent(){if(!currentId)return;setPatch(currentId,{status:"无后续"});$("jobDialog").close()}
function download(name,content,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove()}
function csvCell(v){const s=String(v??"");return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(){const a=mergedApps();const cols=["company","role","city","salary","source","recruitType","employment","track","status","applied","lastContact","deadline","priority","core","match","risk","next","note","url"];const head=["公司","岗位","城市","薪资","来源","招聘类型","工作性质","方向","状态","投递日期","最近互动","截止日期","优先级","核心主线","匹配点","风险","下一步","备注","链接"];const body=[head.map(csvCell).join(","),...a.map(r=>cols.map(c=>csvCell(r[c])).join(","))].join("\n");download(`求职投递看板-${new Date().toISOString().slice(0,10)}.csv`,`\ufeff${body}`,"text/csv;charset=utf-8")}
function importJson(file){const reader=new FileReader();reader.onload=()=>{try{const arr=JSON.parse(reader.result);if(!Array.isArray(arr))throw new Error();const baseIds=new Set(DATA.applications.map(x=>x.id));arr.forEach(o=>{if(!o.id)o.id=`import-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;if(baseIds.has(o.id))patches[o.id]=o;else{const i=extras.findIndex(x=>x.id===o.id);if(i>=0)extras[i]=o;else extras.push(o)}});save();renderAll();alert(`已导入 ${arr.length} 条记录。`)}catch(e){alert("JSON格式无法识别。")}};reader.readAsText(file,"utf-8")}
function renderAll(){renderStats();renderFunnel();fillFilters();renderApplications();renderFocus();renderArchive();renderHC();renderWatch()}
function init(){
  $("cloudUpdated").textContent=DATA.meta.updated||"—";$("scopeNote").textContent=DATA.meta.note||"";
  $("f-status").innerHTML=STATUSES.map(s=>`<option>${s}</option>`).join("");
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.view).classList.add("active")});
  ["q","cityFilter","trackFilter","statusFilter","priorityFilter","formalOnly"].forEach(id=>$(id).addEventListener(id==="q"?"input":"change",renderApplications));
  $("addJob").onclick=newJob;$("saveJob").onclick=saveForm;$("archiveJob").onclick=archiveCurrent;
  $("exportJson").onclick=()=>download(`求职投递看板-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(mergedApps(),null,2),"application/json;charset=utf-8");
  $("exportCsv").onclick=exportCsv;$("importJson").onchange=e=>{const f=e.target.files[0];if(f)importJson(f);e.target.value=""};
  $("resetLocal").onclick=()=>{if(confirm("清除当前浏览器里的本地修改并恢复GitHub云端基线？")){patches={};extras=[];save();renderAll()}};
  renderAll();
}
init();
})();