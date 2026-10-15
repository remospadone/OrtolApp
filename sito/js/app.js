/* OrtolApp — demo front-end per la tesi.
   Tutti i dati vivono esclusivamente in memoria: un caricamento completo
   della pagina ricrea la sessione. Nessun account, ordine o pagamento reale. */
(() => {
  'use strict';
  const D = window.ORTOL_DATA;
  dayjs.extend(dayjs_plugin_utc);
  dayjs.extend(dayjs_plugin_timezone);
  dayjs.locale('it');
  const ZONE = 'Europe/Rome';
  const app = document.getElementById('app');
  const screen = document.getElementById('screen');
  const modalRoot = document.getElementById('modal-root');
  const euro = cents => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents / 100);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowRome = () => dayjs().tz(ZONE);
  const product = id => D.products.find(p=>p.id===id);
  const weight = grams => grams < 1000 ? `${grams} g` : `${(grams/1000).toLocaleString('it-IT')} kg`;
  const linePrice = (p, grams) => Math.round(p.price * grams / 1000);
  const icon = (name, extra='') => `<img class="icon ui-icon ${extra}" src="assets/icons/${name}.svg" alt="" draggable="false">`;
  const initialState = () => ({
    route:'onboarding',onboarding:0,user:null,cart:{},favorites:[],quantities:{},search:'',cards:[],orders:[],nextOrder:1,nextCard:1,
    preferredMethod:'cash',avatar:'',addresses:[{id:'pickup',label:'Ritiro in sede',city:'Andria',street:'Via Repubblica Italiana',number:'37',cap:'76123'},{id:'home',label:'Casa',city:'Andria',street:'Viale Marche',number:'51',cap:'76123'},{id:'work',label:'Lavoro',city:'Trani',street:'Via Re di Puglia',number:'1',cap:'76125'}],
    checkout:null,editing:false,cardReturn:'payment',profileReturn:'profile',confirmation:null
  });
  let state = initialState();
  let toastTimer, calendar, modalCleanup, lastFocus, sendingTimer;
  const scrollMemory = new Map();
  let navIndex = 0;
  const cartTotal = () => Object.entries(state.cart).reduce((sum,[id,g])=>sum + linePrice(product(id),g),0);
  const cartCount = () => Object.keys(state.cart).length;
  const checkoutTotal = () => state.checkout?.type==='box' ? D.box.price : cartTotal();
  const displayAddress = a => `${a.street}, ${a.number} - ${a.city}`;
  function availableSlots(date, now = dayjs()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    let parsed;
    try { parsed = dayjs.tz(`${date} 12:00`, ZONE); } catch { return []; }
    if (!parsed.isValid() || parsed.format('YYYY-MM-DD') !== date) return [];
    const threshold = dayjs(now).add(1,'hour').valueOf();
    return D.slots.filter(slot=>dayjs.tz(`${date} ${slot.id}`,ZONE).valueOf()>=threshold);
  }
  function firstBookableDate() {
    let date = nowRome().format('YYYY-MM-DD');
    while (!availableSlots(date).length) date = dayjs(`${date}T12:00`).add(1,'day').format('YYYY-MM-DD');
    return date;
  }
  function validSlot() {
    return Boolean(state.checkout && availableSlots(state.checkout.date).some(s=>s.id===state.checkout.slot));
  }
  function toast(message) {
    const el=document.getElementById('toast');
    el.textContent=message;el.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300);
  }
  function animatePage() {
    if (!window.anime || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    anime({targets:app.querySelector('.scroll, .onboarding, .auth-form, .confirmation-box'),opacity:[0,1],translateX:[12,0],duration:270,easing:'easeOutQuad'});
  }
  function navigate(route, {replace=false, restore=false}={}) {
    const scroller = app.querySelector('.scroll,.auth-scroll');
    if (scroller) scrollMemory.set(state.route,scroller.scrollTop);
    closeModal();
    if (!state.user && !['onboarding','login','signup'].includes(route)) route='login';
    state.route=route;
    if (!restore) {
      if (!replace) navIndex++;
      history[replace?'replaceState':'pushState']({ortol:true,route,index:navIndex},'',`#${route}`);
    }
    render();
    if (restore && scroller) {
      const next=app.querySelector('.scroll,.auth-scroll');
      if(next) next.scrollTop=scrollMemory.get(route)||0;
    }
  }
  function back() {
    if (state.editing && ['delivery','schedule','payment','edit-profile'].includes(state.route)) state.editing=false;
    if (history.state?.ortol && history.state.index>0) history.back();
    else navigate(state.user?'home':'login',{replace:true});
  }
  function header(title, {logo=false,noBack=false}={}) {
    return `<header class="app-header">${noBack?'':`<button class="back icon-button" data-action="back" aria-label="Indietro">${icon('back','white-icon')}</button>`}${logo?'<img class="header-logo" src="assets/logo-homepage.svg" alt="OrtolApp">':`<h1>${esc(title)}</h1>`}</header>`;
  }
  function nav(active) {
    return `<nav class="nav" aria-label="Navigazione principale">${[['home','Home','home'],['profile','Profilo','profilo'],['favorites','Preferiti','preferiti'],['cart','Carrello','carrello']].map(([route,label,file])=>`<button data-go="${route}" ${active===route?'aria-current="page"':''} aria-label="${label}">${route==='home'?'<img class="icon" src="assets/icons/logo-home.svg" alt="" draggable="false">':icon(`${file}-${active===route?'pieno':'vuoto'}`)}<span>${label}</span>${route==='cart'&&cartCount()?`<span class="nav-badge">${cartCount()}</span>`:''}</button>`).join('')}</nav>`;
  }
  function shell(title,body,{navigation='',footer='',logo=false,noBack=false,contentClass=''}={}) {
    return `<div class="app-shell">${header(title,{logo,noBack})}<main class="scroll ${navigation?'with-nav':''} ${contentClass}" id="main-content">${body}</main>${footer}${navigation?nav(navigation):''}</div>`;
  }
  function button(label,action,disabled=false,extra='') {
    return `<button class="button ${extra}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
  }
  function footer(action,label='Avanti',{cart=false,disabled=false}={}) {
    const box = !cart && state.checkout?.type==='box';
    const total = box ? D.box.price : cartTotal();
    return `<footer class="checkout-footer"><div class="total-line"><span>Totale:</span><span data-total>${euro(total)}</span></div><p class="total-info">${box?'Weekly Bag: 1':`Prodotti nel carrello: ${cartCount()}`}<br>Ordine minimo: ${euro(D.minimumOrder)}</p>${button(label,action,disabled)}</footer>`;
  }
  function banner(asButton=true) {
    const tag=asButton?'button':'div';
    return `<${tag} class="weekly-banner panel" ${asButton?'data-go="box" aria-label="Scopri Weekly Bag"':''}><div class="eyebrow"><img src="assets/leaf-weeklybag.svg" alt="">OGGI È IL GIORNO GIUSTO PER MANGIARE SANO</div><h2>Weekly <span>Bag</span></h2><p class="banner-copy">Una selezione di prodotti freschi e di stagione per la tua spesa settimanale.</p><span class="banner-link">SCOPRILA E ACQUISTALA</span><img class="bag" src="assets/bag-weeklybag.webp" alt="" draggable="false"></${tag}>`;
  }
  function renderHome() {
    return shell('Home',`<button class="search" data-action="open-search"><span class="search-mark"></span><span style="font-size:10px;color:#8eaa90">Cerca un prodotto...</span></button>${banner()}<div class="category-grid">${D.categories.map(c=>`<button class="category-tile panel" data-go="category/${c.id}"><img src="assets/categories/${c.image}.webp" alt="" draggable="false"><h2>${c.homeName||c.name}</h2><p>${c.description}</p></button>`).join('')}</div>`,{navigation:'home',logo:true,noBack:true,contentClass:'home-content'});
  }
  function stepper(p,amount,context) {
    return `<div class="stepper"><button data-action="quantity" data-id="${p.id}" data-dir="-1" data-context="${context}" ${amount<=p.step?'disabled':''} aria-label="Riduci quantità di ${p.name}">${icon('meno')}</button><output aria-label="Quantità di ${p.name}">${weight(amount)}</output><button data-action="quantity" data-id="${p.id}" data-dir="1" data-context="${context}" aria-label="Aumenta quantità di ${p.name}">${icon('piu')}</button></div>`;
  }
  function productCard(p) {
    const grams=state.cart[p.id]??state.quantities[p.id]??p.step;
    const favorite=state.favorites.includes(p.id);
    const inCart=state.cart[p.id]!=null;
    return `<article class="product-card panel" data-product="${p.id}"><button class="favorite" data-action="favorite" data-id="${p.id}" aria-label="${favorite?'Rimuovi':'Aggiungi'} ${p.name} ${favorite?'dai':'ai'} preferiti" aria-pressed="${favorite}">${icon(`preferiti-${favorite?'pieno':'vuoto'}`)}</button><img class="product-image" src="${p.image}" alt="${p.name}" loading="lazy" draggable="false"><div class="product-info"><div class="product-top"><h2>${p.name}</h2><strong>${euro(linePrice(p,grams))}</strong></div><p class="unit-price">${(p.price/100).toLocaleString('it-IT',{minimumFractionDigits:2})} <small>€ / kg</small></p><div class="product-actions">${stepper(p,grams,'catalog')}<button class="add-cart ${inCart?'in-cart':''}" data-action="add-cart" data-id="${p.id}" aria-label="${inCart?'Rimuovi':'Aggiungi'} ${p.name} ${inCart?'dal':'al'} carrello" aria-pressed="${inCart}"><span class="cart-icon" aria-hidden="true">${icon('carrello-vuoto','white-icon')}</span><span class="added-flash" aria-hidden="true">✓</span></button></div></div></article>`;
  }
  const productList = products => `<div class="product-list">${products.map(productCard).join('')}</div>`;
  function empty(message,iconName,description='') {
    return `<div class="empty-state">${icon(iconName)}<h2>${message}</h2>${description?`<p>${description}</p>`:''}</div>`;
  }
  function renderCatalog(id) {
    const c=D.categories.find(c=>c.id===id);
    return shell(c.name,productList(D.products.filter(p=>p.category===id)),{navigation:'catalog'});
  }
  function searchResults() {
    const q=state.search.trim().toLocaleLowerCase('it');
    return D.products.filter(p=>p.name.toLocaleLowerCase('it').includes(q));
  }
  function renderSearch() {
    const products=searchResults();
    return shell('Ricerca',`<div class="search"><span class="search-mark"></span><input id="search-input" type="search" autocomplete="off" placeholder="Cerca un prodotto..." value="${esc(state.search)}" aria-label="Cerca un prodotto"><button class="clear-search" data-action="clear-search" aria-label="Cancella ricerca">×</button></div><div id="search-results">${products.length?productList(products):empty('Nessun prodotto trovato','busta','Prova a cercare un altro prodotto.')}</div>`,{navigation:'search'});
  }
  function renderFavorites() {
    const products=state.favorites.map(product).filter(Boolean);
    return shell('Preferiti',products.length?productList(products):empty('Non ci sono preferiti','preferiti-vuoto'),{navigation:'favorites'});
  }
  function renderCart() {
    const rows=Object.entries(state.cart).map(([id,grams])=>{
      const p=product(id);
      return `<article class="cart-row panel" data-product="${id}"><div class="row"><h2>${p.name}</h2><strong>${euro(linePrice(p,grams))}</strong></div><div class="row"><span class="unit-price">${euro(p.price)}/kg</span><div class="cart-controls"><button class="remove-item" data-action="remove-cart" data-id="${id}" aria-label="Rimuovi ${p.name}">${icon('bidone')}</button>${stepper(p,grams,'cart')}</div></div></article>`;
    });
    return shell('Carrello',rows.length?`<div class="cart-list">${rows.join('')}</div>`:empty('Il carrello è vuoto','carrello-vuoto'),{footer:footer('start-loose','Avanti',{cart:true,disabled:cartTotal()<D.minimumOrder})});
  }
  function renderBox() {
    const column=items=>`<div>${items.map(([name,qty])=>`<div class="box-item"><span>${name}</span><strong>${qty}</strong></div>`).join('')}</div>`;
    return shell('Weekly Bag',`${banner(false)}<h2 class="box-heading">Bag settimanale</h2><div class="box-price">${icon('box')}<span>10 prodotti</span><div class="prices"><del>${euro(D.box.originalPrice)}</del><strong>${euro(D.box.price)}</strong></div></div><p class="box-description">Acquista una selezione di prodotti freschi e di stagione per una settimana di gusto, varietà e benessere. Mangiare sano non è mai stato così semplice e comodo!</p><div class="box-contents"><h3>Questa box contiene:</h3><div class="box-columns">${column(D.box.contents.slice(0,5))}${column(D.box.contents.slice(5))}</div></div>`,{contentClass:'box-view',footer:`<div class="bottom-action">${button('Acquista la Box','start-box')}</div>`});
  }
  function renderOnboarding() {
    const slides=[
      {image:'assets/logo-onboarding1.svg',title:'Ortaggi freschi ogni giorno a tavola.',copy:'Selezioniamo per te solo i migliori prodotti di stagione direttamente dai produttori del nostro territorio.'},
      {image:'assets/onboarding/mix.webp',title:'Scegli tra le varie categorie.',copy:'Dalla frutta di stagione agli agrumi, dalla verdura alle radici e i tuberi: tutto ciò che ti serve per una spesa sana e completa.'},
      {image:'assets/onboarding/box.webp',title:'Scegli, ordina e ricevi comodamente a casa.',copy:'Sulla nostra app puoi personalizzare la spesa o acquistare le box settimanali, tutto comodamente da casa tua.'}
    ];
    const slide=slides[state.onboarding];
    return `<main class="onboarding"><button class="skip" data-go="login" ${state.onboarding===2?'style="visibility:hidden" tabindex="-1"':''}>Salta</button><div class="onboarding-hero"><img src="${slide.image}" ${state.onboarding===0?'class="onboarding-logo"':''} alt="${state.onboarding===0?'OrtolApp':''}"></div><div><h1>${slide.title}</h1><p class="intro-copy">${slide.copy}</p></div><div class="dots" aria-label="Schermate introduttive">${slides.map((_,i)=>`<button data-action="slide" data-index="${i}" class="${state.onboarding===i?'active':''}" aria-label="Introduzione ${i+1} di 3" ${state.onboarding===i?'aria-current="step"':''}></button>`).join('')}</div>${button(state.onboarding===2?'Inizia':'Avanti','next-slide',false,'green-button')}</main>`;
  }
  function field(label,name,type='text',value='',placeholder='',attrs='') {
    return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}></label>`;
  }
  function errorArea() {return '<p class="form-error" id="form-error" role="alert"></p>';}
  function renderAuth(signup) {
    const fields=signup?`${field('Nome','firstName','text','','Inserisci il tuo nome...','required maxlength="50" autocomplete="off"')}${field('Cognome','lastName','text','','Inserisci il tuo cognome...','required maxlength="50" autocomplete="off"')}${field('Data di nascita','birth','date','','',`max="${nowRome().format('YYYY-MM-DD')}"`)}${field('Telefono','phone','tel','','Inserisci il tuo numero di telefono...','required maxlength="25"')}`:'';
    return `<main class="auth-scroll"><div class="auth-header"><img src="assets/logo-login.svg" alt="OrtolApp"><div class="auth-tabs"><button data-go="login" class="${!signup?'active':''}">Accedi</button><button data-go="signup" class="${signup?'active':''}">Registrati</button></div></div><form class="auth-form ${signup?'signup-form':''}" data-form="${signup?'signup':'login'}">${fields}${field('Email','email','email','','Inserisci la tua email...','required maxlength="100" autocomplete="off"')}${field('Password','password','password','','Inserisci la tua password...','required maxlength="100" autocomplete="off"')}${signup?'':'<button class="forgot" type="button" disabled>Password dimenticata?</button>'}${errorArea()}<button class="button" type="submit">${signup?'Registrati':'Accedi'}</button><p class="demo-note">Demo: usa dati di fantasia.</p></form></main>`;
  }
  function avatar() {
    return `<div class="avatar">${state.avatar?`<img class="custom-avatar" src="${state.avatar}" alt="Foto del profilo">`:icon('profilo-pieno','white-icon')}</div>`;
  }
  function renderProfile() {
    const u=state.user;
    const row=(label,name,route)=>`<button class="menu-row" ${route?`data-go="${route}"`:'disabled aria-disabled="true"'}>${icon(name)}<span>${label}</span>${label!=='Logout'?'<span class="chevron">›</span>':''}</button>`;
    return shell('Profilo',`<div class="profile-identity panel">${avatar()}<div class="identity-text"><h2>${esc(u.firstName)} ${esc(u.lastName)}</h2><p>${esc(u.email)}</p><p>Iscritto dal ${dayjs(u.joined).format('DD/MM/YYYY')}</p></div></div><div class="menu-section">${row('Modifica i dati dell’account','modifica','edit-profile')}${row('I miei ordini','busta','orders')}${row('Metodi di pagamento','carta','methods')}</div><div class="menu-section">${row('Notifiche','campanella')}${row('Info sulla privacy','lucchetto')}${row('Contattaci','email')}<button class="menu-row" data-action="logout">${icon('esci')}<span>Logout</span></button></div>`,{navigation:'profile'});
  }
  function renderEditProfile() {
    const u=state.user;
    return shell('Modifica i dati',`<form class="profile-edit" data-form="profile"><div class="avatar-wrap">${avatar()}<button type="button" class="avatar-edit" data-action="upload-avatar" aria-label="Modifica foto profilo">${icon('modifica')}</button><input type="file" id="avatar-input" accept="image/*" hidden></div>${field('Modifica nome','firstName','text',u.firstName,'Inserisci il tuo nome...','required maxlength="50"')}${field('Modifica cognome','lastName','text',u.lastName,'Inserisci il tuo cognome...','maxlength="50"')}${field('Modifica data di nascita','birth','date',u.birth,'',`max="${nowRome().format('YYYY-MM-DD')}"`)}${field('Modifica telefono','phone','tel',u.phone,'Inserisci il tuo numero di telefono...','required maxlength="25"')}${field('Modifica email','email','email',u.email,'Inserisci la tua email...','required maxlength="100"')}${field('Modifica password','password','password',u.password,'Inserisci la tua password...','maxlength="100" autocomplete="off"')}${errorArea()}<button class="button" type="submit">Salva</button></form>`,{navigation:'profile'});
  }
  function renderOrders() {
    const body=state.orders.length?`<div class="orders-list">${state.orders.map(o=>`<article class="order-card panel"><div class="row"><strong>Numero ordine:</strong><strong>#${String(o.id).padStart(6,'0')}</strong></div><div class="row"><span>Inoltrato il giorno:</span><span>${dayjs(o.created).tz(ZONE).format('DD/MM/YYYY')}</span></div><div class="order-track"><span class="order-line" aria-hidden="true"><span class="order-line-fill" style="width:${o.cancelled?'0':'16.667%'}"></span></span>${['Ricevuto',o.address.id==='pickup'?'Pronto':'Spedito',o.address.id==='pickup'?'Ritirato':'Consegnato'].map((s,i)=>`<span class="step ${i===0&&!o.cancelled?'done':''}"><span class="square">${i===0&&!o.cancelled?'✓':''}</span><span>${s}</span></span>`).join('')}</div><div class="order-actions"><button class="order-cancel" data-action="cancel-order" data-id="${o.id}" ${o.cancelled?'disabled':''}>${o.cancelled?'Ordine annullato':'Annulla ordine'}</button><p class="order-kind">Totale: <strong>${euro(o.total)}</strong></p></div></article>`).join('')}</div>`:empty('Non ci sono ordini','busta');
    return shell('Ordini',body,{navigation:'profile'});
  }
  function beginCheckout(type) {
    if(type==='loose'&&cartTotal()<D.minimumOrder){toast(`L’ordine minimo è ${euro(D.minimumOrder)}.`);return;}
    state.checkout={type,addressId:'pickup',date:firstBookableDate(),slot:'',phone:state.user.phone||'',notes:'',method:state.preferredMethod};state.editing=false;
    navigate('delivery');
  }
  function renderDelivery() {
    const c=state.checkout;
    return shell('Consegna',`<div class="choice-list">${state.addresses.map(a=>`<button class="choice-card panel ${c.addressId===a.id?'selected':''}" data-action="select-address" data-id="${a.id}" role="radio" aria-checked="${c.addressId===a.id}"><span class="radio"></span><span><h2>${esc(a.label)}</h2><p>${esc(displayAddress(a))}</p></span></button>`).join('')}</div><button class="small-button delivery-add" data-go="address">${icon('piu','white-icon')}Aggiungi indirizzo</button>`,{footer:footer('next-delivery')});
  }
  function renderAddress() {
    return shell('Aggiungi indirizzo',`<form data-form="address">${field('Città','city','text','','Inserisci la città...','required maxlength="60"')}${field('CAP','cap','text','','Inserisci il CAP della tua città...','required inputmode="numeric" pattern="[0-9]{5}" maxlength="5"')}${field('Indirizzo','street','text','','Inserisci l’indirizzo...','required maxlength="100"')}${field('Numero civico','number','text','','Inserisci il numero civico...','required maxlength="12"')}${field('Etichetta','label','text','','Inserisci l’etichetta (es. “Casa”)','required maxlength="30"')}${errorArea()}<div class="form-action"><button class="button" type="submit">Aggiungi indirizzo</button></div></form>`,{contentClass:'form-view'});
  }
  function renderSchedule() {
    const c=state.checkout;
    const slot=D.slots.find(s=>s.id===c.slot);
    return shell('Inserisci i dati',`<div class="schedule-panel panel"><button class="schedule-row" data-action="open-calendar"><span>Giorno</span><span class="schedule-value">${dayjs(c.date).format('DD/MM/YYYY')}<i class="down-chevron"></i></span></button><button class="schedule-row" data-action="open-slots"><span>Fascia oraria</span><span class="schedule-value">${slot?slot.label:'Seleziona'}<i class="down-chevron"></i></span></button><label class="schedule-row"><span>Telefono</span><input type="tel" name="checkout-phone" aria-label="Telefono per la consegna" value="${esc(c.phone)}" placeholder="Inserisci" maxlength="25"></label></div><hr class="schedule-divider"><div class="note-panel panel"><label for="order-notes">Note</label><textarea id="order-notes" name="checkout-notes" maxlength="500" placeholder="Scrivi qui eventuali segnalazioni per il corriere, richieste, ecc.">${esc(c.notes)}</textarea></div>`,{footer:footer('next-schedule')});
  }
  function paymentName(method) {
    if(method.startsWith('card-')) {
      const c=state.cards.find(c=>c.id===method);
      return c?`${c.label} · **** **** **** ${c.last4}`:'Carta';
    }
    return {cash:'Contanti alla consegna',card:'Carta',bank:'Conto corrente',paypal:'Paypal'}[method]||'Carta';
  }
  function renderPayments(checkout) {
    const selected=checkout?state.checkout.method:state.preferredMethod;
    const savedCard=state.cards.find(c=>c.id===selected)||state.cards[state.cards.length-1];
    const options=[['cash','Contanti alla consegna','contanti',''],[savedCard?.id||'card',savedCard?.label||'Carta','carta',savedCard?`**** **** **** ${savedCard.last4}`:''],['bank','Conto corrente','casaconeuro',''],['paypal','Paypal','paypal','']];
    const row=(id,label,name,sub='')=>`<button class="payment-choice ${selected===id?'selected':''}" data-action="select-payment" data-id="${id}" data-context="${checkout?'checkout':'profile'}" role="radio" aria-checked="${selected===id}"><span class="radio"></span>${name==='paypal'?'<img class="icon" src="assets/paypal-logo.svg" alt="">':icon(name)}<span>${esc(label)}${sub?`<small>${esc(sub)}</small>`:''}</span></button>`;
    return shell(checkout?'Pagamento':'Metodi di pagamento',`<div class="payments-panel panel">${options.map(([id,label,name,sub])=>row(id,label,name,sub)).join('')}</div><button class="small-button payment-add" data-action="open-card" data-context="${checkout?'checkout':'profile'}">${icon('piu','white-icon')}Aggiungi carta</button>`,checkout?{footer:footer('next-payment')}:{navigation:'profile'});
  }
  function renderCard() {
    return shell('Aggiungi carta',`<form data-form="card" autocomplete="off">${field('Numero carta','cardNumber','text','','Inserisci il numero della carta...','required inputmode="numeric" maxlength="23"')}<div class="field-row">${field('Scadenza carta','expiry','text','','MM/AA','required inputmode="numeric" maxlength="5"')}${field('CVV','cvv','password','','CVV','required inputmode="numeric" maxlength="4"')}</div>${field('Titolare carta','holder','text','','Inserisci il nome del titolare...','required maxlength="80"')}${field('Etichetta','label','text','','Inserisci l’etichetta (es. “Carta prepagata”)','maxlength="30"')}<p class="demo-note">Carta dimostrativa: usa numeri inventati.<br>Esempio: 4242 4242 4242 4242 · 12/30 · 123</p>${errorArea()}<div class="form-action"><button class="button" type="submit">Aggiungi carta</button></div></form>`,{contentClass:'form-view'});
  }
  function renderSummary() {
    const c=state.checkout,u=state.user,a=state.addresses.find(a=>a.id===c.addressId),slot=D.slots.find(s=>s.id===c.slot);
    return shell('Riepilogo ordine',`<h2 class="summary-title">Riepilogo</h2><button class="summary-card panel" data-action="edit-checkout" data-target="delivery"><span><h2>${dayjs(c.date).format('D MMMM YYYY')} | ${slot?slot.label:''}</h2><p>${esc(a.street)}, ${esc(a.number)}<br>${esc(a.city)}${a.id==='pickup'?' · Ritiro in sede':''}</p></span>${icon('modifica')}</button><button class="summary-card panel" data-action="edit-checkout" data-target="schedule"><span><h2>${esc(u.firstName)} ${esc(u.lastName)}</h2><p>${esc(c.phone)}<br>${esc(u.email)}</p></span>${icon('modifica')}</button><button class="summary-card panel" data-action="edit-checkout" data-target="payment"><span><h2>Pagamento</h2><p>${esc(paymentName(c.method))}</p></span>${icon('modifica')}</button>`,{footer:footer('place-order','Invia ordine')});
  }
  function renderConfirmation() {
    const order=state.confirmation;
    return `<main class="confirmation"><div class="confirmation-box">${order?.complete?`<div class="success-mark">✓</div><h1>Ordine inviato correttamente</h1><p>Ordine #${String(order.id).padStart(6,'0')}<br>Il tuo ordine è stato ricevuto.</p>${button('I miei ordini','view-orders',false,'green-button')}<button class="text-button" data-go="home">Torna alla Home</button>`:'<div class="progress-track"><div class="progress-fill"></div></div><h1>Invio dell’ordine in corso...</h1>'}</div></main>`;
  }
  function render({preserve=false,motion=true}={}) {
    const previousScroll=app.querySelector('.scroll,.auth-scroll')?.scrollTop||0;
    if(calendar){calendar.destroy();calendar=null;}
    let view;
    if(state.route.startsWith('category/')) view=renderCatalog(state.route.split('/')[1]);
    else switch(state.route) {
      case 'onboarding':view=renderOnboarding();break;
      case 'login':view=renderAuth(false);break;
      case 'signup':view=renderAuth(true);break;
      case 'home':view=renderHome();break;
      case 'search':view=renderSearch();break;
      case 'favorites':view=renderFavorites();break;
      case 'cart':view=renderCart();break;
      case 'box':view=renderBox();break;
      case 'profile':view=renderProfile();break;
      case 'edit-profile':view=renderEditProfile();break;
      case 'orders':view=renderOrders();break;
      case 'methods':view=renderPayments(false);break;
      case 'delivery':view=renderDelivery();break;
      case 'address':view=renderAddress();break;
      case 'schedule':view=renderSchedule();break;
      case 'payment':view=renderPayments(true);break;
      case 'add-card':view=renderCard();break;
      case 'summary':view=renderSummary();break;
      case 'confirmation':view=renderConfirmation();break;
      default:state.route='home';view=renderHome();
    }
    app.innerHTML=view;
    document.title=`OrtolApp${app.querySelector('h1')?' · '+app.querySelector('h1').textContent:''}`;
    document.querySelector('.status-bar').classList.toggle('light',state.route!=='onboarding');
    screen.classList.toggle('dark-bottom',Boolean(app.querySelector('.checkout-footer,.confirmation')));
    if(preserve){const scroll=app.querySelector('.scroll,.auth-scroll');if(scroll)scroll.scrollTop=previousScroll;}
    if(motion)animatePage();
  }
  function updateProducts() {
    const active=document.activeElement;
    const restore=active?.dataset?.action==='quantity'?{id:active.dataset.id,dir:active.dataset.dir}:null;
    render({preserve:true,motion:false});
    if(restore)app.querySelector(`[data-action="quantity"][data-id="${restore.id}"][data-dir="${restore.dir}"]`)?.focus({preventScroll:true});
  }
  function showModal(content,{className='',onConfirm=null,onClose=null}={}) {
    closeModal();lastFocus=document.activeElement;
    modalRoot.innerHTML=`<div class="modal-overlay"><section class="modal ${className}" role="dialog" aria-modal="true" aria-label="${className==='slot-modal'?'Fascia oraria':'Seleziona'}" tabindex="-1">${content}</section></div>`;
    app.inert=true;
    const modal=modalRoot.querySelector('.modal');
    modal.focus({preventScroll:true});
    modalRoot.querySelector('[data-confirm]')?.addEventListener('click',()=>onConfirm?.());
    modalRoot.querySelector('[data-close]')?.addEventListener('click',closeModal);
    modalRoot.querySelector('.modal-overlay').addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))closeModal();});
    modalCleanup=onClose;
    if(window.anime&&!matchMedia('(prefers-reduced-motion: reduce)').matches)anime({targets:modal,opacity:[0,1],scale:[.96,1],duration:180,easing:'easeOutQuad'});
  }
  function closeModal() {
    if(!modalRoot.firstChild)return;
    if(calendar){calendar.destroy();calendar=null;}
    modalCleanup?.();modalCleanup=null;modalRoot.innerHTML='';app.inert=false;
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
  }
  function modalFooter(confirm='Conferma') {return `<div class="modal-footer"><button data-close>Annulla</button><button data-confirm>${confirm}</button></div>`;}
  function openCalendar() {
    let selected=state.checkout.date;
    showModal(`<h2>Scegli il giorno</h2><div class="calendar-holder"><input class="calendar-input" id="calendar-input"></div>${modalFooter()}`,{onConfirm:()=>{
      if(!availableSlots(selected).length){toast('Scegli un giorno con fasce disponibili.');return;}
      state.checkout.date=selected;state.checkout.slot='';closeModal();render({motion:false});
    }});
    calendar=flatpickr(modalRoot.querySelector('#calendar-input'),{inline:true,locale:'it',dateFormat:'Y-m-d',defaultDate:selected,minDate:nowRome().format('YYYY-MM-DD'),disableMobile:true,enable:[date=>availableSlots(dayjs(date).format('YYYY-MM-DD')).length>0],onChange:(_,date)=>{selected=date;}});
  }
  function openSlots() {
    let selected=state.checkout.slot;
    const slots=availableSlots(state.checkout.date);
    if(!slots.length){state.checkout.date=firstBookableDate();state.checkout.slot='';render({motion:false});toast('Le fasce di oggi sono terminate. Seleziona un nuovo orario.');return;}
    showModal(`<div class="slot-list" role="radiogroup" aria-label="Fasce orarie">${slots.map(s=>`<button class="slot-option ${s.id===selected?'selected':''}" data-slot="${s.id}" role="radio" aria-checked="${s.id===selected}"><span class="radio"></span><span>${s.label}</span></button>`).join('')}</div>${modalFooter()}`,{className:'slot-modal',onConfirm:()=>{
      if(!availableSlots(state.checkout.date).some(s=>s.id===selected)){toast('Seleziona una fascia oraria disponibile.');return;}
      state.checkout.slot=selected;closeModal();render({motion:false});
    }});
    modalRoot.querySelectorAll('[data-slot]').forEach(el=>el.addEventListener('click',()=>{
      selected=el.dataset.slot;modalRoot.querySelectorAll('[data-slot]').forEach(b=>{b.classList.toggle('selected',b===el);b.setAttribute('aria-checked',String(b===el));});
    }));
  }
  function validateSchedule() {
    if(!/^[+\d\s().-]{6,25}$/.test(state.checkout.phone.trim())){toast('Inserisci un numero di telefono.');app.querySelector('[name="checkout-phone"]')?.focus();return false;}
    if(!validSlot()){state.checkout.slot='';toast('Seleziona una fascia oraria disponibile, almeno un’ora da adesso.');return false;}
    return true;
  }
  function placeOrder() {
    if(state.confirmation&&!state.confirmation.complete)return;
    if(!validateSchedule()){state.editing=false;navigate('schedule');return;}
    const c=state.checkout;
    if(c.type==='loose'&&cartTotal()<D.minimumOrder){navigate('cart');toast('L’ordine non raggiunge il minimo.');return;}
    if(c.method==='card'){toast('Aggiungi o seleziona una carta.');navigate('payment');return;}
    const order={id:state.nextOrder++,type:c.type,total:checkoutTotal(),items:c.type==='box'?[{id:'weekly-bag',quantity:1}]:Object.entries(state.cart).map(([id,grams])=>({id,grams,subtotal:linePrice(product(id),grams)})),address:{...state.addresses.find(a=>a.id===c.addressId)},date:c.date,slot:c.slot,phone:c.phone,notes:c.notes,method:paymentName(c.method),created:new Date().toISOString(),status:'Ricevuto',cancelled:false};
    state.orders.unshift(order);
    if(c.type==='loose')state.cart={};
    state.confirmation={id:order.id,complete:false};state.editing=false;
    navigate('confirmation',{replace:true});
    if(window.anime&&!matchMedia('(prefers-reduced-motion: reduce)').matches)anime({targets:'.progress-fill',width:['0%','100%'],duration:1100,easing:'easeInOutQuad'});
    sendingTimer=setTimeout(()=>{state.confirmation.complete=true;state.checkout=null;if(state.route==='confirmation')render();},1200);
  }
  app.addEventListener('click',e=>{
    const target=e.target.closest('button,[data-go]');
    if(!target||target.disabled)return;
    if(target.dataset.go){
      if(target.dataset.go==='edit-profile'){state.profileReturn='profile';state.editing=false;}
      navigate(target.dataset.go);return;
    }
    const id=target.dataset.id;
    switch(target.dataset.action) {
      case 'back':back();break;
      case 'next-slide':if(state.onboarding<2){state.onboarding++;render();}else navigate('login');break;
      case 'slide':state.onboarding=Number(target.dataset.index);render();break;
      case 'open-search':navigate('search');app.querySelector('#search-input').focus();break;
      case 'clear-search':state.search='';render({motion:false});app.querySelector('#search-input').focus();break;
      case 'quantity':{
        const p=product(id),inCart=state.cart[id]!=null;
        const current=inCart?state.cart[id]:(state.quantities[id]||p.step);
        const amount=Math.max(p.step,current+Number(target.dataset.dir)*p.step);
        state.quantities[id]=amount;if(inCart)state.cart[id]=amount;
        updateProducts();break;
      }
      case 'favorite':{
        const found=state.favorites.includes(id);state.favorites=found?state.favorites.filter(i=>i!==id):[...state.favorites,id];updateProducts();toast(found?'Rimosso dai preferiti':'Aggiunto ai preferiti');break;
      }
      case 'add-cart':{
        const p=product(id),g=state.quantities[id]||p.step;
        const removing=state.cart[id]!=null;
        if(removing)delete state.cart[id];else state.cart[id]=g;
        target.classList.toggle('in-cart',!removing);
        target.setAttribute('aria-pressed',String(!removing));
        target.setAttribute('aria-label',`${removing?'Aggiungi':'Rimuovi'} ${p.name} ${removing?'al':'dal'} carrello`);
        const oldNav=app.querySelector('.nav');if(oldNav)oldNav.outerHTML=nav(state.route);
        toast(removing?`${p.name} rimosso dal carrello`:`${p.name}: ${weight(g)} aggiunti al carrello`);break;
      }
      case 'remove-cart':delete state.cart[id];updateProducts();toast('Prodotto rimosso');break;
      case 'start-loose':beginCheckout('loose');break;
      case 'start-box':beginCheckout('box');break;
      case 'select-address':state.checkout.addressId=id;render({preserve:true,motion:false});break;
      case 'next-delivery':if(state.editing){state.editing=false;navigate('summary');}else navigate('schedule');break;
      case 'open-calendar':openCalendar();break;
      case 'open-slots':openSlots();break;
      case 'next-schedule':if(validateSchedule()){if(state.editing){state.editing=false;navigate('summary');}else navigate('payment');}break;
      case 'select-payment':if(target.dataset.context==='checkout')state.checkout.method=id;else state.preferredMethod=id;render({preserve:true,motion:false});break;
      case 'open-card':state.cardReturn=target.dataset.context==='checkout'?'payment':'methods';navigate('add-card');break;
      case 'next-payment':if(state.checkout.method==='card'){state.cardReturn='payment';navigate('add-card');break;}state.editing=false;navigate('summary');break;
      case 'edit-checkout':state.editing=false;navigate(target.dataset.target);break;
      case 'place-order':placeOrder();break;
      case 'view-orders':navigate('orders',{replace:true});break;
      case 'cancel-order':showModal(`<h2>Annullare l’ordine?</h2><p class="modal-description">L’ordine #${String(id).padStart(6,'0')} verrà annullato.</p>${modalFooter('Annulla ordine')}`,{onConfirm:()=>{const order=state.orders.find(o=>String(o.id)===id);if(order)order.cancelled=true;closeModal();render({preserve:true,motion:false});toast('Ordine annullato');}});break;
      case 'upload-avatar':app.querySelector('#avatar-input').click();break;
      case 'logout':clearTimeout(sendingTimer);if(state.avatar)URL.revokeObjectURL(state.avatar);state=initialState();navIndex=0;scrollMemory.clear();navigate('login',{replace:true});break;
    }
  });
  app.addEventListener('input',e=>{
    if(e.target.id==='search-input') {
      state.search=e.target.value;
      const results=searchResults();
      app.querySelector('#search-results').innerHTML=results.length?productList(results):empty('Nessun prodotto trovato','busta','Prova a cercare un altro prodotto.');
    }
    if(e.target.name==='checkout-phone')state.checkout.phone=e.target.value;
    if(e.target.name==='checkout-notes')state.checkout.notes=e.target.value;
    if(e.target.name==='cardNumber')e.target.value=e.target.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();
    if(e.target.name==='expiry') {const digits=e.target.value.replace(/\D/g,'').slice(0,4);e.target.value=digits.length>2?digits.slice(0,2)+'/'+digits.slice(2):digits;}
  });
  app.addEventListener('change',e=>{
    if(e.target.id==='avatar-input'){
      const file=e.target.files[0];if(!file)return;
      if(!file.type.startsWith('image/')||file.size>8*1024*1024){toast('Scegli un’immagine di dimensioni inferiori a 8 MB.');return;}
      const url=URL.createObjectURL(file),probe=new Image();
      probe.onload=()=>{if(state.avatar)URL.revokeObjectURL(state.avatar);state.avatar=url;const el=app.querySelector('.avatar');if(el)el.outerHTML=avatar();};
      probe.onerror=()=>{URL.revokeObjectURL(url);toast('Questa immagine non può essere aperta.');};probe.src=url;
    }
  });
  app.addEventListener('submit',e=>{
    e.preventDefault();const form=e.target;const type=form.dataset.form;if(!type)return;
    const data=Object.fromEntries(new FormData(form));
    for(const key in data)if(typeof data[key]==='string')data[key]=data[key].trim();
    const fail=msg=>{const el=form.querySelector('#form-error');if(el)el.textContent=msg;else toast(msg);};
    if(type==='login'||type==='signup') {
      if(!data.email||!data.password){fail('Inserisci email e password.');return;}
      if(type==='signup'&&(!data.firstName||!data.lastName)){fail('Inserisci nome e cognome.');return;}
      if(type==='signup'&&!/^[+\d\s().-]{6,25}$/.test(data.phone)){fail('Inserisci un numero di telefono valido.');return;}
      state.user={firstName:data.firstName||'',lastName:data.lastName||'',email:data.email,password:data.password,phone:data.phone||'',birth:data.birth||'',joined:nowRome().format('YYYY-MM-DD')};
      form.reset();navigate('home',{replace:true});
    } else if(type==='profile') {
      if(!data.firstName||!/^[+\d\s().-]{6,25}$/.test(data.phone)){fail('Controlla nome e numero di telefono.');return;}
      Object.assign(state.user,data);
      if(state.profileReturn==='summary'&&state.checkout)state.checkout.phone=data.phone;
      state.editing=false;navigate(state.profileReturn);toast('Dati aggiornati');
    } else if(type==='address') {
      if(['city','street','number','label'].some(k=>!data[k])){fail('Completa tutti i campi.');return;}
      if(!/^\d{5}$/.test(data.cap)){fail('Il CAP deve contenere 5 cifre.');return;}
      const address={...data,id:`address-${state.addresses.length}`};state.addresses.push(address);state.checkout.addressId=address.id;navigate('delivery');toast('Indirizzo aggiunto');
    } else if(type==='card') {
      const digits=data.cardNumber.replace(/\D/g,'');
      if(digits.length<13||digits.length>19){fail('Inserisci da 13 a 19 cifre per la carta dimostrativa.');return;}
      if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(data.expiry)){fail('Usa il formato MM/AA per la scadenza.');return;}
      if(!/^\d{3,4}$/.test(data.cvv)){fail('Inserisci 3 o 4 cifre per il CVV dimostrativo.');return;}
      if(!data.holder){fail('Inserisci il titolare della carta.');return;}
      const card={id:`card-${state.nextCard++}`,label:data.label||'Carta',last4:digits.slice(-4),holder:data.holder,expiry:data.expiry};
      state.cards.push(card);state.preferredMethod=card.id;
      if(state.cardReturn==='payment'&&state.checkout)state.checkout.method=card.id;
      form.reset();toast('Carta dimostrativa aggiunta');
      if(history.state?.ortol&&history.state.index>0)history.back();else navigate(state.cardReturn,{replace:true});
    }
  });
  document.addEventListener('keydown',e=>{
    const modal=modalRoot.querySelector('.modal');if(!modal)return;
    if(e.key==='Escape'){e.preventDefault();closeModal();}
    if(e.key==='Tab'){
      const list=[...modal.querySelectorAll('button:not(:disabled),input:not([type="hidden"]),select,[tabindex="0"]')].filter(el=>el.getClientRects().length);
      if(!list.length){e.preventDefault();return;}
      const first=list[0],last=list[list.length-1];
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal)){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modal)){e.preventDefault();first.focus();}
    }
  });
  window.addEventListener('popstate',e=>{
    if(!e.state?.ortol)return;
    navIndex=e.state.index;
    let route=e.state.route;
    if(['delivery','schedule','payment','summary','address'].includes(route)&&!state.checkout)route='home';
    if(route==='confirmation'&&!state.confirmation)route='home';
    navigate(route,{restore:true});
  });
  function resizeDevice() {
    if(window.innerWidth>=600) {
      document.documentElement.style.setProperty('--phone-scale',Math.max(.25,Math.min(1,(window.innerHeight-48)/874,(window.innerWidth-48)/415)));
    }
  }
  resizeDevice();window.addEventListener('resize',resizeDevice);
  window.visualViewport?.addEventListener('resize',()=>{
    const keyboard=window.innerHeight-window.visualViewport.height>120;
    screen.classList.toggle('keyboard-open',keyboard);
  });
  const cursor=document.getElementById('touch-cursor');
  screen.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';cursor.classList.toggle('visible',e.pointerType==='mouse'&&!e.target.matches('input,textarea'));});
  screen.addEventListener('pointerleave',()=>cursor.classList.remove('visible'));
  screen.addEventListener('pointerdown',()=>cursor.classList.add('down'));
  window.addEventListener('pointerup',()=>cursor.classList.remove('down'));
  function updateClock(){document.getElementById('clock').textContent=nowRome().format('H:mm');}
  updateClock();setInterval(updateClock,30000);
  // Un ritorno dalla back-forward cache equivale a una nuova apertura.
  window.addEventListener('pageshow',e=>{if(e.persisted)window.location.reload();});
  history.replaceState({ortol:true,route:'onboarding',index:0},'','#onboarding');render();
  // API di sola lettura per verificare catalogo e regole della demo.
  window.OrtolApp=Object.freeze({availableSlots:(date,now)=>availableSlots(date,now),getState:()=>JSON.parse(JSON.stringify(state)),getCartTotal:cartTotal});
  // Compatibilità facoltativa con browser che espongono WebMCP.
  const context=document.modelContext;
  if(context?.registerTool){
    const lifetime=new AbortController();
    Promise.resolve(context.registerTool({name:'ortolapp_read_cart',description:'Legge il carrello dimostrativo corrente senza modificarlo.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('Nessun parametro previsto.');return {items:Object.entries(state.cart).map(([id,grams])=>({id,grams})),totalCents:cartTotal()};}},{signal:lifetime.signal})).catch(()=>{});
    window.addEventListener('pagehide',()=>lifetime.abort(),{once:true});
  }
})();
