const $ = (s) => document.querySelector(s);
let selectedDateAvailability = null;
const dateField = document.querySelector("#event-date");
const availabilityMessage = document.querySelector("#availability-message");
async function checkDateAvailability(date){
  selectedDateAvailability=null;
  if(!date){if(availabilityMessage)availabilityMessage.textContent="Choose a date to check available booking spots.";return}
  if(availabilityMessage)availabilityMessage.textContent="Checking availability…";
  try{const r=await fetch(`/api/availability?date=${encodeURIComponent(date)}`);const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not check availability.");selectedDateAvailability=d;
    if(d.unavailable||d.available<1){availabilityMessage.textContent="No available spots on this date. Please choose another date or contact us.";availabilityMessage.dataset.state="full";}
    else{availabilityMessage.textContent=`${d.available} of ${d.capacity} booking spot${d.capacity===1?"":"s"} available for this date.`;availabilityMessage.dataset.state="available";}
  }catch(e){availabilityMessage.textContent="Availability could not be checked. Please contact us before submitting.";availabilityMessage.dataset.state="error";}
}
if(dateField){const now=new Date();dateField.min=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;dateField.addEventListener("change",()=>checkDateAvailability(dateField.value));}
const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function loadSite(){
  try{
    const r=await fetch("/api/site"); const data=await r.json(); const s=data.settings||{};
    if(s.tagline) $("#tagline").textContent=s.tagline;
    if(s.about) $("#about-text").textContent=s.about;
    if(s.phone) { $("#contact-phone").textContent=s.phone; $("#contact-phone").href=`tel:${s.phone.replace(/[^+\d]/g,"")}`; }
    if(s.whatsapp) $("#contact-whatsapp").href=`https://wa.me/${s.whatsapp.replace(/\D/g,"")}`;
    if(s.location) $("#contact-location").textContent=s.location;
    if(s.service_area) $("#contact-service-area").textContent=s.service_area;
    if(s.business_hours) $("#contact-hours").textContent=s.business_hours;
    if(s.whatsapp){const wa=`https://wa.me/${s.whatsapp.replace(/\D/g,"")}`;$("#contact-whatsapp").href=wa;$("#whatsapp-float").href=wa;}
    if(s.instagram){$("#instagram-link").href=s.instagram;$("#instagram-link").hidden=false;}
    if(s.facebook) $("#facebook-link").href=s.facebook;
    else $("#facebook-link").hidden=true;
    if(s.business_name) document.title=`${s.business_name} | Beautifully considered celebrations`;
    if(data.services?.length) $("#service-grid").innerHTML=data.services.map((x,i)=>`<article class="service-card"><span>${String(i+1).padStart(2,"0")}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></article>`).join("");
    if(data.portfolio?.length) {
      const categories=[...new Set(data.portfolio.map(x=>x.category||"Event decor"))];
      const work=document.querySelector("#work");
      const filter=document.createElement("div");filter.className="portfolio-filters";filter.setAttribute("aria-label","Filter portfolio by event type");
      filter.innerHTML=`<button type="button" class="active" data-portfolio-filter="all">All work</button>${categories.map(c=>`<button type="button" data-portfolio-filter="${esc(c)}">${esc(c)}</button>`).join("")}`;
      document.querySelector(".portfolio-filters")?.remove();document.querySelector("#portfolio-grid").before(filter);
      const grid=document.querySelector("#portfolio-grid");
      grid.innerHTML=data.portfolio.map(x=>`<button type="button" class="portfolio-placeholder portfolio-real" data-portfolio-category="${esc(x.category||"Event decor")}" data-portfolio-image="${esc(x.image)}" data-portfolio-title="${esc(x.title)}" style="background-image:linear-gradient(0deg,rgba(25,25,22,.55),transparent 65%),url('${esc(x.image)}')"><span>${esc(x.category).toUpperCase()}</span><strong>${esc(x.title)}</strong></button>`).join("");
      filter.addEventListener("click",e=>{const b=e.target.closest("[data-portfolio-filter]");if(!b)return;filter.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));grid.querySelectorAll("[data-portfolio-category]").forEach(card=>card.hidden=b.dataset.portfolioFilter!=="all"&&card.dataset.portfolioCategory!==b.dataset.portfolioFilter)});
    }
    if(data.testimonials?.length) {
      $("#testimonials").hidden=false;
      $("#testimonials-grid").innerHTML=data.testimonials.map(x=>`<article class="testimonial-card"><span class="testimonial-mark">“</span><blockquote>${esc(x.quote)}</blockquote><strong>${esc(x.client_name)}</strong><small>${esc(x.event_type||"Client")}</small></article>`).join("");
    }
  }catch(e){console.warn("Site content could not be loaded",e)}
}
// Homepage event selection and public material catalogue.
const eventSelect=document.querySelector('[name="event_type"]');
const eventCards=[...document.querySelectorAll('.event-choice')];
let activeEvent='Wedding';
let homeMaterials=[];
const selectedMaterials=new Map();
const money=n=>'MWK '+Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
function setActiveEvent(value){
  activeEvent=value;
  if(eventSelect)eventSelect.value=value;
  eventCards.forEach(card=>{const active=card.dataset.event===value;card.classList.toggle('selected',active);card.setAttribute('aria-pressed',String(active));const label=card.querySelector('.event-choose-label');if(label)label.textContent=active?'Selected ✓':'Choose event'});
  const label=document.querySelector('#selected-event-label');if(label)label.textContent=value;
}
eventCards.forEach(card=>card.addEventListener('click',()=>setActiveEvent(card.dataset.event)));
if(eventSelect){eventSelect.addEventListener('change',()=>setActiveEvent(eventSelect.value));}
function renderHomeMaterials(){
 const host=document.querySelector('#home-materials');if(!host)return;
 if(!homeMaterials.length){host.innerHTML='<p class="material-loading">No decoration materials have been published yet. You can still send an enquiry and describe what you need.</p>';updateHomeMaterialSummary();return;}
 host.innerHTML=homeMaterials.map(m=>{const c=selectedMaterials.get(Number(m.id));const image=m.image_url?`<img src="${esc(m.image_url)}" alt="${esc(m.name)}" loading="lazy">`:'<div class="home-material-placeholder">EMMA’S DECOR</div>';return `<article class="home-material-card">${image}<div class="home-material-card-body"><small>${esc(m.category||'Decoration detail')}</small><h3>${esc(m.name)}</h3><p>${esc(m.description||'A detail to personalise your celebration.')}</p>${m.quantity_available!==null&&m.quantity_available!==undefined?`<small class="stock-note">${Number(m.quantity_available)>0?`${Number(m.quantity_available)} available`:'Currently unavailable'}</small>`:''}<div class="home-material-card-bottom"><span>${m.price_type==='fixed'&&m.price_mwk!=null?money(m.price_mwk)+' / '+esc(m.unit||'item'):'Request a quotation'}</span><button type="button" data-home-material="${Number(m.id)}" class="${c?'is-selected':''}" ${m.quantity_available!==null&&m.quantity_available!==undefined&&Number(m.quantity_available)<1?'disabled':''}>${m.quantity_available!==null&&m.quantity_available!==undefined&&Number(m.quantity_available)<1?'Unavailable':c?'Selected ✓':'Select +'}</button></div>${c?`<label class="material-quantity">Quantity<input type="number" min="1" max="${m.quantity_available===null||m.quantity_available===undefined?1000:Math.max(1,Number(m.quantity_available))}" value="${c.quantity}" data-home-quantity="${Number(m.id)}"></label>`:''}</div></article>`}).join('');
 updateHomeMaterialSummary();
}
function updateHomeMaterialSummary(){
 const summary=document.querySelector('#home-material-summary'),totalEl=document.querySelector('#home-material-total');if(!summary||!totalEl)return;
 let total=0;const lines=[];
 for(const [id,c] of selectedMaterials){const m=homeMaterials.find(x=>Number(x.id)===id);if(!m)continue;const fixed=m.price_type==='fixed'&&m.price_mwk!=null;if(fixed)total+=Number(m.price_mwk)*c.quantity;lines.push(`<div class="home-summary-line"><span>${esc(m.name)} × ${c.quantity}</span><strong>${fixed?money(Number(m.price_mwk)*c.quantity):'Quote'}</strong></div>`)}
 summary.innerHTML=lines.length?lines.join(''):'No materials selected yet.';totalEl.textContent=money(total);
}
async function loadHomeMaterials(){const host=document.querySelector('#home-materials');if(!host)return;try{const r=await fetch('/api/planner/catalogue');const d=await r.json();if(!r.ok)throw new Error();homeMaterials=d.materials||[];renderHomeMaterials()}catch{host.innerHTML='<p class="material-loading">We could not load the materials right now. You can still describe your decoration ideas in the request form.</p>'}}
const homeMaterialHost=document.querySelector('#home-materials');
if(homeMaterialHost){homeMaterialHost.addEventListener('click',e=>{const b=e.target.closest('[data-home-material]');if(!b)return;const id=Number(b.dataset.homeMaterial);if(selectedMaterials.has(id))selectedMaterials.delete(id);else selectedMaterials.set(id,{quantity:1});renderHomeMaterials()});homeMaterialHost.addEventListener('change',e=>{const id=Number(e.target.dataset.homeQuantity);if(!id||!selectedMaterials.has(id))return;const m=homeMaterials.find(x=>Number(x.id)===id);const limit=m?.quantity_available===null||m?.quantity_available===undefined?1000:Math.max(1,Number(m.quantity_available));selectedMaterials.get(id).quantity=Math.max(1,Math.min(limit,Number(e.target.value)||1));e.target.value=selectedMaterials.get(id).quantity;updateHomeMaterialSummary()});}
document.querySelector('#continue-to-request')?.addEventListener('click',()=>{if(eventSelect)eventSelect.value=activeEvent;document.querySelector('#enquire')?.scrollIntoView({behavior:'smooth',block:'start'});document.querySelector('[name="name"]')?.focus({preventScroll:true})});
setActiveEvent('Wedding');loadHomeMaterials();

// Public visual availability calendar: dates are read from the same capacity rules used by the admin.
const calendarGrid=$("#public-calendar-grid"), calendarLabel=$("#calendar-month-label"), calendarFeedback=$("#calendar-feedback");
let calendarMonth=new Date(); calendarMonth.setDate(1);
function dateISO(y,m,d){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
async function renderPublicCalendar(){
 if(!calendarGrid)return;const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),month=`${y}-${String(m+1).padStart(2,"0")}`;
 calendarLabel.textContent=calendarMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});calendarGrid.innerHTML='<p class="material-loading">Checking dates…</p>';
 try{const r=await fetch(`/api/availability/month?month=${month}`);const data=await r.json();if(!r.ok)throw Error(data.error||"Could not load dates.");
 const offset=new Date(y,m,1).getDay();const today=new Date();today.setHours(0,0,0,0);
 const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
 calendarGrid.innerHTML=names.map(n=>`<span class="calendar-weekday">${n}</span>`).join("")+Array.from({length:offset},()=>'<span class="calendar-empty"></span>').join("")+data.days.map(d=>{const dt=new Date(`${d.date}T00:00:00`);const past=dt<today;const full=d.unavailable||d.available<1;const cls=past?'past':full?'full':'available';const label=past?'Past date':d.unavailable?'Unavailable':full?'Fully booked':`${d.available} spot${d.available===1?'':'s'} available`;return `<button type="button" class="calendar-day ${cls}" data-calendar-date="${d.date}" ${past||full?'disabled':''} aria-label="${d.date}: ${label}"><b>${Number(d.date.slice(-2))}</b><small>${past?'Past':full?'Full':`${d.available} left`}</small></button>`}).join("");
 calendarGrid.querySelectorAll('[data-calendar-date]').forEach(b=>b.addEventListener('click',()=>{if(dateField){dateField.value=b.dataset.calendarDate;checkDateAvailability(dateField.value);calendarFeedback.textContent=`${b.dataset.calendarDate} selected. Continue your enquiry to request this date.`;document.querySelector('#enquire')?.scrollIntoView({behavior:'smooth',block:'start'});}}));
 }catch(e){calendarGrid.innerHTML=`<p class="calendar-feedback">${esc(e.message)} Please contact Emma’s Decor to check a date.</p>`}
}
$("#calendar-prev")?.addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderPublicCalendar()});
$("#calendar-next")?.addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderPublicCalendar()});
renderPublicCalendar();
$("#whatsapp-float")?.addEventListener("click",e=>{e.preventDefault();const phone=new URL($("#whatsapp-float").href).pathname.split("/").filter(Boolean).pop();const date=dateField?.value||"not selected yet";const message=`Hello Emma’s Decor, I would like to ask about a ${activeEvent} event. Event date: ${date}. Please share more information.`;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer")});
// Open real portfolio uploads in a lightweight viewer.
document.addEventListener('click',e=>{const item=e.target.closest('[data-portfolio-image]');if(!item)return;const overlay=document.createElement('div');overlay.className='portfolio-lightbox';overlay.innerHTML=`<button type="button" aria-label="Close image">×</button><figure><img src="${esc(item.dataset.portfolioImage)}" alt="${esc(item.dataset.portfolioTitle)}"><figcaption>${esc(item.dataset.portfolioTitle)}</figcaption></figure>`;overlay.addEventListener('click',ev=>{if(ev.target===overlay||ev.target.tagName==='BUTTON')overlay.remove()});document.body.append(overlay)});
$("#enquiry-form")?.addEventListener("submit",async e=>{
  e.preventDefault(); const form=e.currentTarget; const button=form.querySelector("button"); const msg=$("#form-message");
  button.disabled=true; button.textContent="Sending…"; msg.textContent="";
  try{
    if(dateField?.value){if(!selectedDateAvailability || selectedDateAvailability.date!==dateField.value) await checkDateAvailability(dateField.value);if(!selectedDateAvailability || selectedDateAvailability.available<1) throw new Error("This date has no available booking spots. Please select another date.");}
    const payload=Object.fromEntries(new FormData(form).entries());
    const materialLines=[...selectedMaterials].map(([id,c])=>{const m=homeMaterials.find(x=>Number(x.id)===id);return m?`${m.name} × ${c.quantity}${m.price_type==='fixed'&&m.price_mwk!=null?` (listed ${money(Number(m.price_mwk)*c.quantity)})`:' (quote requested)'}`:null}).filter(Boolean);
    const materialNote=materialLines.length?`Selected decoration materials:\n${materialLines.join('\n')}`:'';
    const packageInterest=payload.package_interest;
    delete payload.package_interest;
    payload.details=[packageInterest?`Decoration package / service: ${packageInterest}`:"",materialNote,payload.details].filter(Boolean).join("\n\n");
    const r=await fetch("/api/enquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json(); if(!r.ok) throw new Error(d.error||"Could not send enquiry.");
    msg.textContent="Thank you — your enquiry has been received. The team will be in touch."; form.reset();
  }catch(err){msg.textContent=err.message}
  finally{button.disabled=false;button.innerHTML='Send enquiry'}
});
$(".menu-toggle").addEventListener("click",()=>$(".main-nav").classList.toggle("open"));
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>$(".main-nav").classList.remove("open")));
$("#year").textContent=new Date().getFullYear();
loadSite();
