/* Catalogo dimostrativo. Prezzi in centesimi/kg; quantità in grammi.
   I valori sono indicativi e modificabili: non sono un listino commerciale. */
window.ORTOL_DATA = (() => {
  const categories = [
    {id:'frutta', name:'Frutta', image:'frutta', description:'Una vasta selezione di frutta fresca di stagione.'},
    {id:'agrumi', name:'Agrumi', image:'agrumi', description:'Agrumi freschi e profumati, ricchi di gusto.'},
    {id:'verdura', name:'Verdure', homeName:'Verdura', image:'verdura', description:'Una ricca selezione di verdura fresca e di stagione.'},
    {id:'radici', name:'Radici e tuberi', image:'radicituberi', description:'Radici e tuberi freschi, perfetti per ogni ricetta.'},
    {id:'secca', name:'Frutta secca', image:'fruttasecca', description:'Una selezione di frutta secca gustosa, ideale per uno snack.'},
    {id:'aromi', name:'Aromi', image:'aromi', description:'Erbe aromatiche fresche per dare gusto ai tuoi piatti.'}
  ];
  const rows = {
    frutta:[['mele','Mele',250],['pere','Pere',290],['banane','Banane',190],['pesche','Pesche',320],['albicocche','Albicocche',390],['uva','Uva',350],['fragole','Fragole',690],['ciliegie','Ciliegie',790],['melone','Melone',190],['angurie','Anguria',95],['kiwi','Kiwi',390],['fichi','Fichi',490]],
    agrumi:[['arance','Arance',220],['mandarini','Mandarini',290],['limoni','Limoni',250],['pompelmi','Pompelmi',290],['cedri','Cedri',390],['lime','Lime',650]],
    verdura:[['pomodori','Pomodori',290],['zucchine','Zucchine',240],['melanzane','Melanzane',220],['peperoni','Peperoni',350],['insalata','Insalata',290],['rucola','Rucola',990],['spinaci','Spinaci',390],['bietole','Bietole',250],['broccoli','Broccoli',290],['carciofi','Carciofi',490],['cetrioli','Cetrioli',190],['asparagi','Asparagi',790]],
    radici:[['patate','Patate',150],['carote','Carote',160],['barbabietole','Barbabietole',240],['rape','Rape',220],['ravanelli','Ravanelli',390],['cipolle','Cipolle',180]],
    secca:[['mandorle','Mandorle',1290],['noci','Noci',790],['pistacchi','Pistacchi',1990],['nocciole','Nocciole',1490],['pinoli','Pinoli',4990],['arachidi','Arachidi',590]],
    aromi:[['basilico','Basilico',1990],['prezzemolo','Prezzemolo',1490],['rosmarino','Rosmarino',1990],['salvia','Salvia',1990],['timo','Timo',2490],['menta','Menta',1990],['origano','Origano',2490],['maggiorana','Maggiorana',2490],['alloro','Alloro',1990],['peperoncini','Peperoncini',990]]
  };
  const products = Object.entries(rows).flatMap(([category, entries])=>entries.map(([id,name,price])=>({id,name,price,category,step:category==='aromi'?50:category==='secca'?100:500,image:`assets/products/${id}.webp`})));
  const box = {price:2300, originalPrice:2750, name:'Weekly Bag', contents:[['Pomodori','1 kg'],['Spinaci','500 g'],['Carote','1 kg'],['Broccoli','1 kg'],['Zucchine','1 kg'],['Peperoni','500 g'],['Mele','1,5 kg'],['Banane','1,5 kg'],['Kiwi','500 g'],['Arance','1,5 kg']]};
  const slots = [...Array.from({length:10},(_,i)=>480+i*30),...Array.from({length:6},(_,i)=>1020+i*30)].map(minutes=>{
    const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
    return {id:time(minutes),label:`${time(minutes)} - ${time(minutes+30)}`};
  });
  return {categories,products,box,slots,minimumOrder:500};
})();
