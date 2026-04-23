// Obsidian prototype — full gallery with live mode switcher.
// Priority layouts: Masonry, Bento, Album. Others render a compact variant.
// Amber hover glow + film grain overlay. Monospace accents.

const PHOTOS = [
  { id: 1, name: '01_mountain_sunset',  fav: false, hue: 28,  shade: 'mountain',  exif: 'ISO 200 · f/8 · 1/250' },
  { id: 2, name: '02_tropical_beach',   fav: true,  hue: 190, shade: 'beach',     exif: 'ISO 100 · f/11 · 1/500' },
  { id: 3, name: '03_enchanted_forest', fav: true,  hue: 140, shade: 'forest',    exif: 'ISO 400 · f/4 · 1/60' },
  { id: 4, name: '04_aurora_borealis',  fav: false, hue: 270, shade: 'aurora',    exif: 'ISO 1600 · f/2.8 · 8s' },
  { id: 5, name: '05_hot_air_balloons', fav: false, hue: 15,  shade: 'balloons',  exif: 'ISO 200 · f/5.6 · 1/500' },
  { id: 6, name: '06_cherry_blossom',   fav: true,  hue: 330, shade: 'blossom',   exif: 'ISO 200 · f/2.8 · 1/320' },
  { id: 7, name: '07_waterfall',        fav: false, hue: 200, shade: 'waterfall', exif: 'ISO 100 · f/16 · 2s' },
  { id: 8, name: '08_ancient_temple',   fav: false, hue: 38,  shade: 'temple',    exif: 'ISO 320 · f/5.6 · 1/125' },
];

// ---------- Photo placeholder (SVG) ----------
function Photo({ photo }) {
  const { hue, shade, id } = photo;
  const gid = `ph-${id}`;
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"
      style={{ width:'100%', height:'100%', display:'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor={`hsl(${hue}, 55%, 62%)`} />
          <stop offset="55%" stopColor={`hsl(${hue+20}, 65%, 42%)`} />
          <stop offset="100%" stopColor={`hsl(${hue-10}, 50%, 18%)`} />
        </linearGradient>
        <radialGradient id={gid+'-v'} cx="0.5" cy="0.4" r="0.9">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${gid})`} />
      {shade === 'mountain' && (
        <g>
          <polygon points="0,280 90,150 170,220 250,110 340,200 400,170 400,400 0,400" fill="rgba(30,20,10,0.55)" />
          <polygon points="80,170 130,120 180,170 130,155" fill="rgba(255,255,255,0.5)" />
        </g>
      )}
      {shade === 'beach' && (
        <g>
          <rect y="260" width="400" height="140" fill="rgba(255,240,210,0.35)" />
          <ellipse cx="320" cy="100" rx="60" ry="60" fill="rgba(255,240,190,0.6)" />
          <path d="M40,80 Q80,40 130,70 Q100,90 90,140 Q60,120 40,80Z" fill="rgba(20,60,40,0.55)" />
        </g>
      )}
      {shade === 'forest' && (
        <g>
          {[0,60,120,180,240,300,360].map((x,i)=>(
            <rect key={i} x={x} y="80" width="18" height="320" fill="rgba(10,20,10,0.55)" />
          ))}
          <circle cx="220" cy="140" r="70" fill="rgba(255,240,180,0.35)" />
        </g>
      )}
      {shade === 'aurora' && (
        <g>
          <path d="M0,180 Q100,80 200,160 T400,140 L400,260 Q300,200 200,260 T0,250Z"
            fill="rgba(120,255,180,0.35)" />
          {[40,120,200,310,360].map((x,i)=>(
            <circle key={i} cx={x} cy={40+i*10} r="1.5" fill="#fff" />
          ))}
        </g>
      )}
      {shade === 'balloons' && (
        <g>
          {[{x:110,y:150,r:34},{x:200,y:120,r:28},{x:280,y:170,r:32},{x:160,y:210,r:22},{x:320,y:230,r:20}].map((b,i)=>(
            <g key={i}>
              <ellipse cx={b.x} cy={b.y} rx={b.r} ry={b.r*1.1} fill={`hsl(${(i*60)%360},70%,55%)`} />
              <line x1={b.x} y1={b.y+b.r} x2={b.x} y2={b.y+b.r+18} stroke="rgba(0,0,0,0.4)" />
            </g>
          ))}
        </g>
      )}
      {shade === 'blossom' && (
        <g>
          {Array.from({length: 60}).map((_,i)=>(
            <circle key={i} cx={(i*43)%400} cy={(i*71)%400}
              r={2+(i%4)} fill={`rgba(255,210,230,${0.4+(i%3)*0.2})`} />
          ))}
        </g>
      )}
      {shade === 'waterfall' && (
        <g>
          <rect x="150" y="60" width="100" height="280" fill="rgba(230,240,255,0.5)" />
          <ellipse cx="200" cy="340" rx="120" ry="40" fill="rgba(200,220,240,0.6)" />
        </g>
      )}
      {shade === 'temple' && (
        <g>
          <polygon points="140,280 200,120 260,280" fill="rgba(40,30,20,0.7)" />
          <rect x="170" y="230" width="60" height="60" fill="rgba(0,0,0,0.65)" />
        </g>
      )}
      <rect width="400" height="400" fill={`url(#${gid}-v)`} />
    </svg>
  );
}

// ---------- Icons ----------
const Ic = ({ children, size=16, sw=1.6, fill='none' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const ICN = {
  aperture: (<svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="14" cy="14" r="11" />
    {[0,60,120,180,240,300].map((deg,i)=>{
      const r = deg*Math.PI/180;
      const x1 = 14 + Math.cos(r)*11, y1 = 14 + Math.sin(r)*11;
      const x2 = 14 + Math.cos(r+1.2)*4, y2 = 14 + Math.sin(r+1.2)*4;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
    <circle cx="14" cy="14" r="3" fill="currentColor" stroke="none" />
  </svg>),
  masonry:   <Ic><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="12" width="7" height="9"/></Ic>,
  bento:     <Ic><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></Ic>,
  honeycomb: <Ic><polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5"/></Ic>,
  wave:      <Ic><path d="M3 8 Q 8 4, 13 8 T 21 8"/><path d="M3 14 Q 8 10, 13 14 T 21 14"/><path d="M3 20 Q 8 16, 13 20 T 21 20"/></Ic>,
  empire:    <Ic><path d="M12 3 l2 5 h5 l-4 3 1.5 5 -4.5 -3 -4.5 3 1.5 -5 -4 -3 h5 z"/></Ic>,
  minimal:   <Ic><line x1="4" y1="12" x2="20" y2="12"/></Ic>,
  album:     <Ic><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></Ic>,
  login:     <Ic><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M19 4h-6a2 2 0 0 0-2 2v2"/></Ic>,
  sort:      <Ic><path d="M7 4v16"/><path d="M4 7l3-3 3 3"/><path d="M17 20V4"/><path d="M14 17l3 3 3-3"/></Ic>,
  check:     <Ic><polyline points="20 6 9 17 4 12"/></Ic>,
  refresh:   <Ic><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></Ic>,
  sun:       <Ic><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></Ic>,
  moon:      <Ic><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></Ic>,
  star:      <Ic size={11} sw={0} fill="currentColor"><polygon points="12,2 15,9 22,10 17,15 18,22 12,18 6,22 7,15 2,10 9,9" /></Ic>,
  caret:     <Ic size={11}><polyline points="6 9 12 15 18 9"/></Ic>,
  close:     <Ic><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></Ic>,
};

const MODES = [
  { id:'masonry',   label:'Masonry',   icon:ICN.masonry   },
  { id:'bento',     label:'Bento',     icon:ICN.bento     },
  { id:'honeycomb', label:'Honeycomb', icon:ICN.honeycomb },
  { id:'wave',      label:'Wave',      icon:ICN.wave      },
  { id:'empire',    label:'Empire',    icon:ICN.empire    },
  { id:'minimal',   label:'Minimal',   icon:ICN.minimal   },
  { id:'album',     label:'Album',     icon:ICN.album, badge:'NEW' },
];

window.PHOTOS = PHOTOS;
window.Photo = Photo;
window.ICN = ICN;
window.MODES = MODES;
