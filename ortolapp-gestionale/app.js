(() => {
  'use strict';

  const productPath = id => state.products.find(product => product.id === id)?.image || `../sito/assets/products/${id}.webp`;
  const money = value => new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'}).format(value);
  const esc = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

  function uiIcon(name) {
    const originals={cart:'carrello-vuoto',box:'box',profile:'profilo-vuoto'};
    const original=originals[name];
    const path=original?`../sito/assets/icons/${original}.svg`:`assets/icons/${name}.svg`;
    return `<span class="ui-icon ${original?'original-icon':''}" aria-hidden="true"><img src="${path}" alt="" draggable="false"></span>`;
  }

  const navItems = [
    ['dashboard','home','Dashboard'], ['orders','carrello','Ordini'],
    ['inventory','box','Magazzino'], ['customers','profilo','Clienti'], ['analytics','analytics','Analisi']
  ];
  const orderStatuses = {received:'Ricevuto',shipped:'Spedito',cancelled:'Annullato',completed:'Consegnato'};
  const categoryNames = Object.fromEntries(window.ORTOL_DATA.categories.map(category => [category.id, category.name]));
  const products = window.ORTOL_DATA.products.map((product, index) => {
    const simulatedStock = [18.2, 6.1, 12.8, 4.5, 15.4, 8.9, 2.3, 7.2, 11.6, 9.4, 14.1, 5.8][index % 12];
    return {
      id: product.id,
      name: product.name,
      category: categoryNames[product.category],
      price: product.price / 100,
      stock: product.id === 'peperoni' ? 0 : product.id === 'basilico' ? 0.8 : simulatedStock,
      unit: 'kg',
      active: product.id !== 'peperoni',
      sold: 24 + (index * 13) % 73
    };
  });
  const orders = [
    {id:1048,customer:'Giulia Romano',time:'Oggi, 10:42',total:32.50,status:'received',label:'Ricevuto',delivery:'Oggi, 18:00 - 18:30',address:'Via Trani 24, Andria',items:[['pomodori','Pomodori','1 kg',2.90],['mele','Mele','2 kg',5],['spinaci','Spinaci','500 g',1.95],['carote','Carote','1 kg',1.60],['arance','Arance','10 kg',21.05]]},
    {id:1047,customer:'Marco Lorusso',time:'Oggi, 10:18',total:23,status:'received',label:'Ricevuto',delivery:'Oggi, 17:30 - 18:00',address:'Viale Marche 51, Andria',items:[['pomodori','Weekly Bag','1 box',23]]},
    {id:1046,customer:'Elena Ferri',time:'Oggi, 09:56',total:41.80,status:'shipped',label:'Spedito',delivery:'Oggi, 12:00 - 12:30',address:'Via Barletta 108, Andria',items:[['zucchine','Zucchine','2 kg',4.80],['mandorle','Mandorle','1 kg',12.90],['arance','Arance','4 kg',8.80],['kiwi','Kiwi','3,9 kg',15.30]]},
    {id:1045,customer:'Paolo Leone',time:'Oggi, 09:21',total:18.40,status:'completed',label:'Consegnato',delivery:'Oggi, 10:30 - 11:00',address:'Via Regina 7, Trani',items:[['mele','Mele','3 kg',7.50],['carote','Carote','2 kg',3.20],['kiwi','Kiwi','2 kg',7.70]]},
    {id:1044,customer:'Sara Bianchi',time:'Ieri, 19:43',total:27.90,status:'cancelled',label:'Annullato',delivery:'-',address:'Via Corato 13, Andria',items:[['pomodori','Pomodori','2 kg',5.80],['zucchine','Zucchine','3 kg',7.20],['arance','Arance','4 kg',8.80],['carote','Carote','3,8 kg',6.10]]},
    {id:1043,customer:'Antonio Greco',time:'Ieri, 18:12',total:36.20,status:'completed',label:'Consegnato',delivery:'Ieri, 19:30 - 20:00',address:'Piazza Catuma 4, Andria',items:[['peperoni','Peperoni','4 kg',14],['mandorle','Mandorle','1 kg',12.90],['pomodori','Pomodori','3,2 kg',9.30]]}
  ];
  const customers = [
    ['Giulia Romano','giulia.romano@email.it',16,386.40,'Oggi'],['Marco Lorusso','marco.lorusso@email.it',9,218.50,'Oggi'],
    ['Elena Ferri','elena.ferri@email.it',22,541.90,'Oggi'],['Paolo Leone','paolo.leone@email.it',7,164.20,'Oggi'],
    ['Sara Bianchi','sara.bianchi@email.it',13,302.70,'Ieri'],['Antonio Greco','antonio.greco@email.it',31,728.60,'Ieri']
  ];
  const state = {route:'dashboard', orderFilter:'all', productFilter:'Tutti', query:'', chart:'week', products, orders, customers};
  const app = document.querySelector('#app');
  const nav = document.querySelector('#main-nav');
  const modalRoot = document.querySelector('#modal-root');
  const toastNode = document.querySelector('#toast');
  let toastTimer;

  function renderNav() {
    nav.innerHTML = navItems.map(([id, icon, label]) => {
      const active = state.route === id;
      const file = icon === 'box' ? 'box' : `${icon}-${active ? 'pieno' : 'vuoto'}`;
      const custom=icon==='analytics';
      const path=custom?`assets/icons/analytics${active?'-filled':''}.svg`:`../sito/assets/icons/${file}.svg`;
      return `<button class="nav-item ${active ? 'active' : ''}" data-route="${id}" ${active ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true"><img ${custom?'class="nav-custom"':''} src="${path}" alt=""></span><span class="nav-label">${label}</span>${id === 'orders' ? '<span class="nav-count">5</span>' : ''}</button>`;
    }).join('');
  }
  function pageHead(kicker, title, copy, actions='') {
    return `<header class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${copy}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</header>`;
  }
  function status(order) { return `<span class="status ${order.status}">${order.label}</span>`; }
  function orderRows(items, compact=false) {
    return items.map(order => `<tr><td><button class="order-number" data-action="order-detail" data-id="${order.id}">#${order.id}</button></td><td><div class="customer-cell"><span class="customer-avatar">${initials(order.customer)}</span><span>${esc(order.customer)}</span></div></td>${compact ? '' : `<td>${order.time}</td>`}<td><strong>${money(order.total)}</strong></td><td>${status(order)}</td>${compact ? '' : `<td><div class="row-actions"><button class="tiny-button" data-action="order-detail" data-id="${order.id}">Dettagli</button><button class="tiny-button" data-action="advance-order" data-id="${order.id}" ${['completed','cancelled'].includes(order.status)?'disabled':''}>Avanza</button></div></td>`}</tr>`).join('');
  }

  function dashboard() {
    const actions = `<button class="secondary-button" data-route="analytics">${uiIcon('export')} Esporta report</button><button class="primary-button" data-action="new-order">${uiIcon('plus')} Nuovo ordine</button>`;
    return pageHead('Panoramica', 'Buongiorno, Anna', 'Ecco cosa sta succedendo oggi in OrtolApp.', actions) + `
      <section class="stats-grid">
        ${stat('Ordini di oggi','48','↑ 12%','rispetto a ieri','cart')}${stat('Incasso giornaliero','€ 1.284','↑ 8,4%','rispetto a ieri','revenue')}
        ${stat('Ordine medio','€ 26,75','↑ 2,1%','questa settimana','analytics')}${stat('Consegne da evadere','7','↓ 3','dalle 17:00','delivery',true)}
      </section>
      <section class="dashboard-grid">
        <article class="panel chart-panel"><div class="panel-head"><div><h2>Andamento vendite</h2><p>Ricavi negli ultimi 7 giorni</p></div><div class="segmented"><button class="active">7 giorni</button><button>30 giorni</button></div></div>${lineChart()}</article>
        <article class="panel activity-panel"><div class="panel-head"><div><h2>Attività recenti</h2><p>Aggiornamenti in tempo reale</p></div><button class="tiny-button" data-action="notifications">Vedi tutte</button></div><div class="activity-list">
          ${activity('cart','Nuovo ordine #1048','Giulia Romano · € 32,50','2 min')}${activity('check','Ordine #1045 consegnato','Paolo Leone','18 min')}${activity('warning','Scorta pomodori in esaurimento','Restano 4,5 kg','31 min',true)}${activity('profile','Nuova cliente registrata','Francesca Rizzi','1 h')}${activity('delivery','Consegna #1046 partita','Autista: Andrea C.','1 h',true)}
        </div></article>
      </section>
      <section class="lower-grid">
        <article class="panel compact-panel"><div class="panel-head"><div><h2>Ultimi ordini</h2><p>Ordini ricevuti più di recente</p></div><button class="tiny-button" data-route="orders">Tutti gli ordini ${uiIcon('arrow-right')}</button></div><table class="mini-orders"><thead><tr><th>Ordine</th><th>Cliente</th><th>Totale</th><th>Stato</th></tr></thead><tbody>${orderRows(state.orders.slice(0,4),true)}</tbody></table></article>
        <article class="panel compact-panel"><div class="panel-head"><div><h2>Scorte da controllare</h2><p>Prodotti sotto la soglia</p></div><button class="tiny-button" data-route="inventory">Magazzino ${uiIcon('arrow-right')}</button></div><div class="stock-list">${state.products.filter(p=>p.stock<5).map(stockRow).join('')}</div></article>
      </section>`;
  }
  function stat(label, value, trend, note, icon, down=false) { return `<article class="panel stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${down?'orange':''}">${uiIcon(icon)}</span></div><strong class="stat-value">${value}</strong><span class="trend ${down?'down':''}">${uiIcon(trend.startsWith('!')?'warning':trend.startsWith('\u2193')?'arrow-down':'arrow-up')} ${trend.replace(/^[\u2191\u2193!]\s*/, '')} <span>${note}</span></span></article>`; }
  function lineChart() { return `<div class="sales-chart"><div class="chart-y"><span>€2k</span><span>€1,5k</span><span>€1k</span><span>€500</span><span>€0</span></div><div class="chart-lines"><i></i><i></i><i></i><i></i><i></i></div><svg class="chart-svg" viewBox="0 0 700 190" preserveAspectRatio="none" aria-label="Grafico vendite"><defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c7a52" stop-opacity=".28"/><stop offset="1" stop-color="#4c7a52" stop-opacity="0"/></linearGradient></defs><path class="area" d="M0,145 C55,130 65,118 115,125 S190,92 235,102 S315,62 350,77 S425,110 465,82 S535,42 580,57 S655,20 700,35 L700,190 L0,190Z"/><path class="line" d="M0,145 C55,130 65,118 115,125 S190,92 235,102 S315,62 350,77 S425,110 465,82 S535,42 580,57 S655,20 700,35"/><circle cx="700" cy="35" r="5"/></svg><div class="chart-x"><span>Lun</span><span>Mar</span><span>Mer</span><span>Gio</span><span>Ven</span><span>Sab</span><span>Dom</span></div></div>`; }
  function activity(icon,title,copy,time,orange=false) { return `<div class="activity-item"><span class="activity-dot ${orange?'orange':''}">${uiIcon(icon)}</span><div><strong>${title}</strong><p>${copy}</p></div><time>${time}</time></div>`; }
  function stockRow(product) { return `<div class="stock-row"><img src="${productPath(product.id)}" alt=""><div><strong>${product.name}</strong><p>Soglia minima: 5 kg</p></div><span class="stock-value">${String(product.stock).replace('.',',')} ${product.unit}</span></div>`; }

  function ordersView() {
    const filtered = state.orders.filter(order => state.orderFilter === 'all' || order.status === state.orderFilter).filter(order => `${order.id} ${order.customer}`.toLowerCase().includes(state.query.toLowerCase()));
    const filters = [['all','Tutti'],...Object.entries(orderStatuses)];
    const sections = [
      {id:'current-orders',title:'Ordini da gestire',copy:'Ordini ricevuti o spediti, in attesa di consegna.',items:filtered.filter(o=>!['completed','cancelled'].includes(o.status)),show:!['completed','cancelled'].includes(state.orderFilter)},
      {id:'delivered-orders',title:'Ordini consegnati',copy:'Storico degli ordini conclusi con consegna completata.',items:filtered.filter(o=>o.status==='completed'),show:['all','completed'].includes(state.orderFilter)},
      {id:'cancelled-orders',title:'Ordini annullati',copy:'Storico degli ordini annullati.',items:filtered.filter(o=>o.status==='cancelled'),show:['all','cancelled'].includes(state.orderFilter)}
    ];
    return pageHead('Gestione', 'Ordini', `${state.orders.length} ordini registrati nella simulazione.`, `<button class="primary-button" data-action="new-order">${uiIcon('plus')} Nuovo ordine</button>`) + `<div class="toolbar"><label class="search-field">${uiIcon('search')}<input data-search="orders" value="${esc(state.query)}" placeholder="Cerca per numero o cliente..."></label>${filters.map(([id,label])=>`<button class="filter-chip ${state.orderFilter===id?'active':''}" data-order-filter="${id}">${label}</button>`).join('')}</div>` + sections.filter(section=>section.show).map(section=>`<section class="orders-section" aria-labelledby="${section.id}"><div class="panel-head"><div><h2 id="${section.id}">${section.title} (${section.items.length})</h2><p>${section.copy}</p></div></div><div class="panel table-panel">${section.items.length ? `<table class="data-table"><thead><tr><th>Ordine</th><th>Cliente</th><th>Ricevuto</th><th>Totale</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>${orderRows(section.items)}</tbody></table>` : empty('Nessun ordine trovato','Non ci sono ordini in questa sezione per la ricerca o i filtri selezionati.')}</div></section>`).join('');
  }
  function inventoryView() {
    const low = state.products.filter(p=>p.stock<5).length;
    const categories = ['Tutti', ...new Set(state.products.map(p=>p.category))];
    const filtered = state.products.filter(p=>state.productFilter==='Tutti'||p.category===state.productFilter).filter(p=>p.name.toLowerCase().includes(state.query.toLowerCase()));
    return pageHead('Gestione prodotti', 'Magazzino', 'Gestisci catalogo, prezzi, disponibilità e giacenze in un unico spazio.', `<button class="secondary-button" data-action="restock-all">${uiIcon('refresh')} Registra rifornimento</button><button class="primary-button" data-action="new-product">${uiIcon('plus')} Aggiungi prodotto</button>`) + `
      <section class="stats-grid">${stat('Prodotti a catalogo',state.products.length,'↑ 2','questo mese','box')}${stat('Scorta complessiva',`${state.products.reduce((s,p)=>s+p.stock,0).toFixed(1).replace('.',',')} kg`,'↑ 14 kg','ultimo carico','box')}${stat('Sotto soglia',low,'! Richiede','attenzione','warning',true)}${stat('Non disponibili',state.products.filter(p=>!p.active).length,'↓ 1','da ripristinare','close',true)}</section>
      <div class="toolbar"><label class="search-field">${uiIcon('search')}<input data-search="inventory" value="${esc(state.query)}" placeholder="Cerca prodotto..."></label>${categories.map(c=>`<button class="filter-chip ${state.productFilter===c?'active':''}" data-product-filter="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <section class="panel table-panel inventory-panel">${filtered.length ? `<table class="data-table inventory-table"><thead><tr><th>Prodotto</th><th>Categoria</th><th>Prezzo/kg</th><th>Giacenza</th><th>Livello scorta</th><th>Disponibilità</th><th>Vendite 30 gg</th><th>Azioni</th></tr></thead><tbody>${filtered.map(p=>`<tr><td><div class="product-cell"><img class="product-thumb" src="${productPath(p.id)}" alt=""><strong>${esc(p.name)}</strong></div></td><td>${esc(p.category)}</td><td><strong>${money(p.price)}</strong></td><td><strong>${p.stock.toLocaleString('it-IT')} kg</strong></td><td>${p.stock===0?'<span class="status cancelled">Esaurito</span>':p.stock<5?'<span class="status low">Scorta bassa</span>':'<span class="status active">Regolare</span>'}</td><td><button class="switch ${p.active?'on':''}" data-action="toggle-product" data-id="${esc(p.id)}" role="switch" aria-checked="${p.active}" aria-label="Disponibilità di ${esc(p.name)}" ${p.stock===0?'disabled title="Registra un carico per rendere disponibile il prodotto"':''}><i></i></button></td><td>${p.sold} kg</td><td><div class="row-actions"><button class="tiny-button" data-action="restock" data-id="${esc(p.id)}">${uiIcon('plus')} Carico</button><button class="tiny-button" data-action="edit-product" data-id="${esc(p.id)}">Modifica prodotto</button></div></td></tr>`).join('')}</tbody></table>` : empty('Nessun prodotto trovato','Prova a modificare ricerca o categoria.')}</section>`;
  }
  function customersView() {
    const filtered = state.customers.filter(c=>`${c[0]} ${c[1]}`.toLowerCase().includes(state.query.toLowerCase()));
    return pageHead('Relazioni', 'Clienti', `${state.customers.length} profili cliente attivi.`, `<button class="secondary-button" data-action="export">${uiIcon('export')} Esporta elenco</button>`) + `<div class="toolbar"><label class="search-field">${uiIcon('search')}<input data-search="customers" value="${esc(state.query)}" placeholder="Cerca nome o email..."></label></div><section class="cards-grid">${filtered.map(c=>`<article class="panel customer-card"><div class="customer-head"><span class="customer-avatar">${initials(c[0])}</span><div><h3>${c[0]}</h3><p>${c[1]}</p></div><button class="more" data-action="customer-detail" data-name="${c[0]}" aria-label="Dettagli cliente">${uiIcon('more')}</button></div><div class="customer-stats"><div><span>Ordini</span><strong>${c[2]}</strong></div><div><span>Spesa totale</span><strong>${money(c[3])}</strong></div><div><span>Ultimo accesso</span><strong>${c[4]}</strong></div></div></article>`).join('')}</section>`;
  }
  function analyticsView() {
    const bars=[54,67,45,82,73,94,88,62,79,96,85,71];
    const colors=['#4c7a52','#c85a3e','#5c4433','#4c7a5280','#c85a3e80','#5c443380'];
    const categories=[...new Set(state.products.map(p=>p.category))].map((name,index)=>({name,color:colors[index%colors.length],revenue:state.products.filter(p=>p.category===name).reduce((sum,p)=>sum+Math.round(p.price*p.sold*100),0)}));
    const total=categories.reduce((sum,c)=>sum+c.revenue,0);
    categories.forEach(c=>{c.share=total?c.revenue/total*100:0;c.percent=Math.floor(c.share);});
    // Distribute rounding remainder so the displayed percentages add up to 100%.
    if(total){
      const remaining=100-categories.reduce((sum,c)=>sum+c.percent,0);
      [...categories].sort((a,b)=>(b.share-b.percent)-(a.share-a.percent)).slice(0,remaining).forEach(c=>c.percent++);
    }
    let end=0;
    const segments=categories.map(c=>{const start=end;end+=c.percent;return `${c.color} ${start}% ${end}%`;});
    const categoryChart=total?`<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${segments.join(',')})" role="img" aria-label="${esc(categories.map(c=>`${c.name}: ${c.percent}%`).join(', '))}"></div><div class="legend">${categories.map(c=>`<div class="legend-row" title="${esc(money(c.revenue/100))}"><i style="background:${c.color}"></i><span>${esc(c.name)}</span><strong>${c.percent}%</strong></div>`).join('')}</div></div>`:empty('Nessuna vendita','Il grafico sarà disponibile quando ci saranno vendite registrate.');
    return pageHead('Statistiche', 'Analisi vendite', 'Dati aggregati della simulazione per il mese corrente.', `<button class="secondary-button" data-action="export">${uiIcon('download')} Scarica report</button>`) + `<section class="stats-grid">${stat('Ricavi mensili','€ 28.640','↑ 14,2%','sul mese scorso','revenue')}${stat('Ordini totali','1.084','↑ 9,8%','sul mese scorso','cart')}${stat('Nuovi clienti','126','↑ 18,5%','sul mese scorso','profile')}${stat('Tasso riacquisto','64%','↑ 3,1%','sul mese scorso','refresh')}</section><section class="analytics-grid"><article class="panel chart-panel"><div class="panel-head"><div><h2>Ricavi giornalieri</h2><p>Ultimi 12 giorni</p></div><strong>${money(9842)}</strong></div><div class="bar-chart">${bars.map((h,i)=>`<div class="bar-group"><i style="height:${h}%" title="${h*18} euro"></i><span>${i+1} ott</span></div>`).join('')}</div></article><article class="panel chart-panel"><div class="panel-head"><div><h2>Vendite per categoria</h2><p>Ricavi stimati: prezzo/kg × vendite degli ultimi 30 giorni</p></div></div>${categoryChart}</article></section>`;
  }
  function empty(title, copy) { return `<div class="empty-state"><strong>${title}</strong><p>${copy}</p></div>`; }

  function render() {
    renderNav();
    const views = {dashboard,orders:ordersView,inventory:inventoryView,customers:customersView,analytics:analyticsView};
    app.innerHTML = views[state.route]();
    document.title = `${navItems.find(item=>item[0]===state.route)[2]} · OrtolApp Gestionale`;
  }
  function navigate(route) {
    if (!navItems.some(item=>item[0]===route)) route='dashboard';
    state.route=route; state.query='';
    history.replaceState(null,'',`#${route}`);
    closeMobile(); render(); app.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'smooth'});
  }
  function toast(message) { clearTimeout(toastTimer); toastNode.textContent=message; toastNode.classList.add('show'); toastTimer=setTimeout(()=>toastNode.classList.remove('show'),2600); }
  function closeModal() {
    const form = modalRoot.querySelector('#product-form');
    const image = form?.dataset.image;
    if(image && !state.products.some(product=>product.image===image))URL.revokeObjectURL(image);
    modalRoot.innerHTML='';
  }
  function modal(title, copy, body, footer='') { modalRoot.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${copy}</p></div><button class="modal-close" data-action="close-modal" aria-label="Chiudi">${uiIcon('close')}</button></header><div class="modal-body">${body}</div>${footer?`<footer class="modal-foot">${footer}</footer>`:''}</section>`; }
  function orderDetail(id) {
    const o=state.orders.find(item=>item.id===Number(id));
    if(!o)return;
    modal(`Ordine #${o.id}`,`${esc(o.customer)} · ${o.time}`,`<form id="order-status-form" data-id="${o.id}"><div class="field"><label for="order-status">Stato ordine</label><select id="order-status" name="status" required>${Object.entries(orderStatuses).map(([value,label])=>`<option value="${value}" ${value===o.status?'selected':''}>${label}</option>`).join('')}</select></div></form><div class="detail-list"><div class="detail-row"><span>Consegna</span><strong>${o.delivery}</strong></div><div class="detail-row"><span>Indirizzo</span><strong>${o.address}</strong></div><div class="detail-row"><span>Pagamento</span><strong>Carta •••• 4821</strong></div></div><div class="detail-products">${o.items.map(i=>`<div class="detail-product"><img src="${i[0]==='pomodori'&&i[1]==='Weekly Bag'?'../sito/assets/bag-weeklybag.webp':productPath(i[0])}" alt=""><strong>${i[1]}<small class="muted-text"><br>${i[2]}</small></strong><span>${money(i[3])}</span></div>`).join('')}<div class="detail-row"><span>Totale ordine</span><strong>${money(o.total)}</strong></div></div>`, `<button class="secondary-button" data-action="close-modal">Chiudi</button><button class="primary-button" type="submit" form="order-status-form">Salva stato</button>`);
  }
  function newOrderModal() { modal('Nuovo ordine','Inserimento manuale per assistenza clienti.',`<form id="new-order-form" class="form-grid"><div class="field full"><label>Cliente</label><select name="customer" required><option value="">Seleziona cliente</option>${state.customers.map(c=>`<option>${c[0]}</option>`).join('')}</select></div><div class="field"><label>Prodotto</label><select name="product" required>${state.products.filter(p=>p.active).map(p=>`<option value="${p.id}">${p.name} · ${money(p.price)}/kg</option>`).join('')}</select></div><div class="field"><label>Quantità (kg)</label><input name="quantity" type="number" value="1" min="0.5" step="0.5" required></div><div class="field"><label>Data consegna</label><input name="date" type="date" required></div><div class="field"><label>Fascia oraria</label><select name="slot"><option>17:00 - 17:30</option><option>17:30 - 18:00</option><option>18:00 - 18:30</option><option>18:30 - 19:00</option></select></div><div class="field full"><label>Note</label><textarea name="notes" placeholder="Indicazioni per preparazione o consegna"></textarea></div></form>`, `<button class="secondary-button" data-action="close-modal">Annulla</button><button class="primary-button" type="submit" form="new-order-form">Crea ordine</button>`); }
  function productModal(product=null) {
    modal(product?'Modifica prodotto':'Aggiungi prodotto',product?'Aggiorna prezzo, categoria, giacenza e immagine.':'Crea una nuova voce di catalogo.',`<form id="product-form" class="form-grid" data-id="${esc(product?.id||'')}"><div class="field full"><label>Nome prodotto</label><input name="name" value="${esc(product?.name||'')}" required></div><div class="field"><label>Categoria</label><select name="category">${window.ORTOL_DATA.categories.map(c=>`<option ${product?.category===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>Prezzo al kg</label><input name="price" type="number" min="0" step="0.01" value="${product?.price??''}" required></div><div class="field"><label>Giacenza (kg)</label><input name="stock" type="number" min="0" step="0.1" value="${product?.stock??0}" required></div><div class="field full"><label for="product-image">Immagine prodotto</label><div class="image-upload"><img id="product-image-preview" src="${product?esc(productPath(product.id)):'../sito/assets/icona.svg'}" alt="Anteprima immagine prodotto"><div><input id="product-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-describedby="product-image-help"><small id="product-image-help">PNG, JPG, WebP o GIF, massimo 5 MB. L'immagine resta nella sessione.</small></div></div></div></form>`, `<button class="secondary-button" data-action="close-modal">Annulla</button><button class="primary-button" type="submit" form="product-form">Salva prodotto</button>`);
  }
  function advanceOrder(id) { const o=state.orders.find(item=>item.id===Number(id)); if(!o)return; const next={received:'shipped',shipped:'completed'}[o.status]; if(!next)return; o.status=next;o.label=orderStatuses[next];closeModal();render();toast(`Ordine #${o.id}: ${o.label}`); }
  function closeMobile() { document.querySelector('#sidebar').classList.remove('open'); document.querySelector('#mobile-overlay').classList.remove('show'); }

  function restockModal(id = state.products[0].id) {
    const product = state.products.find(p => p.id === id);
    modal('Registra rifornimento','Aggiornamento rapido delle scorte.',`<form id="restock-form" class="form-grid"><div class="field full"><label for="restock-product">Prodotto</label><select id="restock-product" name="product">${state.products.map(p=>`<option value="${esc(p.id)}" ${p.id===id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field full"><label for="restock-stock">Quantità attualmente disponibile</label><input id="restock-stock" value="${product.stock.toLocaleString('it-IT')} kg" readonly></div><div class="field full"><label for="restock-quantity">Quantità ricevuta (kg)</label><input id="restock-quantity" name="quantity" type="number" min="0.1" step="0.1" placeholder="Inserisci la quantità ricevuta" required></div></form>`,`<button class="secondary-button" data-action="close-modal">Annulla</button><button class="primary-button" type="submit" form="restock-form">Registra carico</button>`);
  }

  document.addEventListener('click', event => {
    const routeButton=event.target.closest('[data-route]'); if(routeButton){navigate(routeButton.dataset.route);return;}
    const filter=event.target.closest('[data-order-filter]'); if(filter){state.orderFilter=filter.dataset.orderFilter;render();return;}
    const productFilter=event.target.closest('[data-product-filter]'); if(productFilter){state.productFilter=productFilter.dataset.productFilter;render();return;}
    const button=event.target.closest('[data-action]'); if(!button)return;
    const {action,id}=button.dataset;
    if(action==='new-order')newOrderModal();
    if(action==='close-modal')closeModal();
    if(action==='order-detail')orderDetail(id);
    if(action==='advance-order')advanceOrder(id);
    if(action==='new-product')productModal();
    if(action==='edit-product')productModal(state.products.find(p=>p.id===id));
    if(action==='toggle-product'){const p=state.products.find(x=>x.id===id);if(p.stock===0)return;p.active=!p.active;render();toast(`${p.name}: ${p.active?'disponibile':'non disponibile'}`);}
    if(action==='restock')restockModal(id);
    if(action==='restock-all')restockModal();
    if(action==='export')toast('Report CSV generato nella simulazione');
    if(action==='notifications')modal('Centro notifiche','3 aggiornamenti richiedono attenzione.',`${activity('warning','Scorta basilico bassa','Restano 0,8 kg','31 min',true)}${activity('cart','Nuovo ordine #1048','In attesa di conferma','2 min')}${activity('delivery','Consegna #1046 in corso','Arrivo stimato 12:18','1 h')}`,`<button class="primary-button" data-action="close-modal">Segna come lette</button>`);
    if(action==='profile')toast('Profilo amministratore attivo');
    if(action==='customer-detail')toast(`Scheda di ${button.dataset.name}`);
  });
  document.addEventListener('input', event => { if(event.target.matches('[data-search]')){state.query=event.target.value;const pos=event.target.selectionStart;render();const next=document.querySelector(`[data-search="${event.target.dataset.search}"]`);next.focus();next.setSelectionRange(pos,pos);} });
  document.addEventListener('change', event => {
    if(event.target.id==='product-image'){
      const input=event.target,form=input.form,file=input.files[0];
      input.setCustomValidity('');
      if(file && (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>5*1024*1024)){
        input.setCustomValidity('Seleziona un file PNG, JPG, WebP o GIF di massimo 5 MB.');
        input.reportValidity();
        return;
      }
      if(form.dataset.image)URL.revokeObjectURL(form.dataset.image);
      const product=state.products.find(p=>p.id===form.dataset.id);
      form.dataset.image=file?URL.createObjectURL(file):'';
      document.querySelector('#product-image-preview').src=form.dataset.image||(product?productPath(product.id):'../sito/assets/icona.svg');
    }
    if (event.target.id === 'restock-product') {
      const product = state.products.find(p => p.id === event.target.value);
      document.querySelector('#restock-stock').value = `${product.stock.toLocaleString('it-IT')} kg`;
    }
  });
  document.addEventListener('submit', event => {
    event.preventDefault(); const data=Object.fromEntries(new FormData(event.target));
    if(event.target.id==='order-status-form'){
      const order=state.orders.find(o=>o.id===Number(event.target.dataset.id));
      if(!order||!Object.hasOwn(orderStatuses,data.status))return;
      order.status=data.status;
      order.label=orderStatuses[data.status];
      closeModal();render();toast(`Ordine #${order.id}: ${order.label}`);
    }
    if(event.target.id==='new-order-form'){const p=state.products.find(x=>x.id===data.product),quantity=Number(data.quantity),id=Math.max(...state.orders.map(o=>o.id))+1;state.orders.unshift({id,customer:data.customer,time:'Adesso',total:p.price*quantity,status:'received',label:'Ricevuto',delivery:`${data.date}, ${data.slot}`,address:'Indirizzo cliente',items:[[p.id,p.name,`${quantity} kg`,p.price*quantity]]});closeModal();navigate('orders');toast(`Ordine #${id} creato`);}
    if(event.target.id==='product-form'){
      const existing=state.products.find(p=>p.id===event.target.dataset.id),stock=Number(data.stock),price=Number(data.price);
      if(!Number.isFinite(stock)||stock<0||!Number.isFinite(price)||price<0)return;
      if(existing){
        if(stock!==existing.stock)existing.active=stock>0;
        Object.assign(existing,{name:data.name,category:data.category,price,stock});
        if(event.target.dataset.image){
          if(existing.image?.startsWith('blob:'))URL.revokeObjectURL(existing.image);
          existing.image=event.target.dataset.image;
        }
      }else{
        const category=window.ORTOL_DATA.categories.find(c=>c.name===data.category);
        state.products.push({id:`product-${crypto.randomUUID()}`,name:data.name,category:data.category,price,stock,unit:'kg',active:stock>0,sold:0,image:event.target.dataset.image||`../sito/assets/categories/${category.image}.webp`});
      }
      closeModal();render();toast('Prodotto salvato');
    }
    if(event.target.id==='restock-form'){const quantity=Number(data.quantity);if(!Number.isFinite(quantity)||quantity<=0)return;const p=state.products.find(x=>x.id===data.product);p.stock=Math.round((p.stock+quantity)*10)/10;p.active=true;closeModal();render();toast(`Carico registrato per ${p.name}`);}
  });
  document.querySelector('#mobile-menu').addEventListener('click',()=>{document.querySelector('#sidebar').classList.add('open');document.querySelector('#mobile-overlay').classList.add('show');});
  document.querySelector('#mobile-overlay').addEventListener('click',closeMobile);
  document.querySelector('#global-search').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.value){if(state.route==='dashboard')state.route='orders';state.query=event.target.value;history.replaceState(null,'',`#${state.route}`);render();app.focus({preventScroll:true});}});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.querySelector('#global-search').focus();}if(event.key==='Escape'){closeModal();closeMobile();}});
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
  state.route=navItems.some(item=>item[0]===location.hash.slice(1))?location.hash.slice(1):'dashboard';
  render();
})();
