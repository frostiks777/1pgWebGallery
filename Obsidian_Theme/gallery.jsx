// GalleryMock — recreates the 1pgWebGallery UI with themeable props.
// Every concept passes in its own tokens; the mock stays the same.

const PHOTOS = [
  { id: 1, name: '01_mountain_sunset',   fav: false, hue: 28,  shade: 'mountain' },
  { id: 2, name: '02_tropical_beach',    fav: true,  hue: 190, shade: 'beach'    },
  { id: 3, name: '03_enchanted_forest',  fav: true,  hue: 140, shade: 'forest'   },
  { id: 4, name: '04_aurora_borealis',   fav: false, hue: 270, shade: 'aurora'   },
  { id: 5, name: '05_hot_air_balloons',  fav: false, hue: 15,  shade: 'balloons' },
  { id: 6, name: '06_cherry_blossom',    fav: true,  hue: 330, shade: 'blossom'  },
  { id: 7, name: '07_waterfall',         fav: false, hue: 200, shade: 'waterfall'},
  { id: 8, name: '08_ancient_temple',    fav: false, hue: 38,  shade: 'temple'   },
];

// ---------- Placeholder photo (SVG gradient by hue) ----------
// Fakes a photo so we can mock without sourcing real images.

function Photo({ photo, h }) {
  const { hue, shade } = photo;
  const id = `ph-${photo.id}-${h|0}`;
  // two-stop gradient + darkened vignette
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor={`hsl(${hue}, 55%, 62%)`} />
          <stop offset="55%" stopColor={`hsl(${hue+20}, 65%, 42%)`} />
          <stop offset="100%" stopColor={`hsl(${hue-10}, 50%, 18%)`} />
        </linearGradient>
        <radialGradient id={id+'-v'} cx="0.5" cy="0.4" r="0.9">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${id})`} />
      {/* silhouette hints per scene */}
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
          {Array.from({length: 40}).map((_,i)=>(
            <circle key={i} cx={(i*43)%400} cy={(i*71)%400}
              r={3+(i%4)} fill={`rgba(255,210,230,${0.4+(i%3)*0.2})`} />
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
      <rect width="400" height="400" fill={`url(#${id}-v)`} />
    </svg>
  );
}

// ---------- Theme-aware icon set ----------
// Logo options: "aperture" | "prism" | "frame"
function Logo({ kind, color, glow }) {
  const stroke = color || '#fff';
  if (kind === 'aperture') {
    return (
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke={stroke} strokeWidth="1.6">
        <circle cx="14" cy="14" r="11" />
        {[0,60,120,180,240,300].map((deg,i)=>{
          const r = deg*Math.PI/180;
          const x1 = 14 + Math.cos(r)*11, y1 = 14 + Math.sin(r)*11;
          const x2 = 14 + Math.cos(r+1.2)*4, y2 = 14 + Math.sin(r+1.2)*4;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round" />;
        })}
        <circle cx="14" cy="14" r="3.2" fill={stroke} stroke="none" opacity=".9" />
      </svg>
    );
  }
  if (kind === 'prism') {
    return (
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
        <polygon points="14,3 25,23 3,23" />
        <line x1="8"  y1="23" x2="22" y2="23" />
        <line x1="14" y1="3"  x2="14" y2="23" opacity=".4" />
        <line x1="22" y1="15" x2="26" y2="13" stroke="#ff6b6b" strokeWidth="1.4" />
        <line x1="22" y1="17" x2="26" y2="17" stroke="#f6c453" strokeWidth="1.4" />
        <line x1="22" y1="19" x2="26" y2="21" stroke="#5fd3f3" strokeWidth="1.4" />
      </svg>
    );
  }
  // frame
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M4 9 h4 l2 -3 h8 l2 3 h4 v15 h-20 z" />
      <circle cx="14" cy="16" r="4.5" />
      <circle cx="14" cy="16" r="1.6" fill={stroke} stroke="none" />
    </svg>
  );
}

// small icons
const Icon = ({ d, size=14, stroke="currentColor", sw=1.5, fill="none" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const I = {
  masonry:   <Icon d={<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="12" width="7" height="9"/></>} />,
  bento:     <Icon d={<><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></>} />,
  honeycomb: <Icon d={<><polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5"/></>} />,
  wave:      <Icon d={<><path d="M3 8 Q 8 4, 13 8 T 21 8"/><path d="M3 14 Q 8 10, 13 14 T 21 14"/><path d="M3 20 Q 8 16, 13 20 T 21 20"/></>} />,
  empire:    <Icon d={<><path d="M12 3 l2 5 h5 l-4 3 1.5 5 -4.5 -3 -4.5 3 1.5 -5 -4 -3 h5 z"/></>} />,
  minimal:   <Icon d={<><line x1="4" y1="12" x2="20" y2="12"/></>} />,
  album:     <Icon d={<><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></>} />,
  login:     <Icon d={<><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M19 4h-6a2 2 0 0 0-2 2v2"/></>} />,
  sort:      <Icon d={<><path d="M7 4v16"/><path d="M4 7l3-3 3 3"/><path d="M17 20V4"/><path d="M14 17l3 3 3-3"/></>} />,
  check:     <Icon d={<><polyline points="20 6 9 17 4 12"/></>} />,
  refresh:   <Icon d={<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>} />,
  sun:       <Icon d={<><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></>} />,
  star:      <Icon size={10} sw={0} fill="currentColor" d={<polygon points="12,2 15,9 22,10 17,15 18,22 12,18 6,22 7,15 2,10 9,9" />} />,
  caret:     <Icon size={10} d={<polyline points="6 9 12 15 18 9"/>} />,
};

// ---------- Chip (mode tab) ----------
function Chip({ icon, label, active, t, badge }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'7px 12px',
      borderRadius: t.chipRadius,
      background: active ? t.chipActiveBg : t.chipBg,
      color: active ? t.chipActiveFg : t.chipFg,
      border: active ? t.chipActiveBorder : t.chipBorder,
      fontFamily: t.uiFont, fontSize: 12, fontWeight: active ? 600 : 500,
      letterSpacing: t.uiTracking,
      boxShadow: active ? t.chipActiveShadow : 'none',
      transition: 'all .15s',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ display:'inline-flex', opacity: active ? 1 : 0.85 }}>{icon}</span>
      <span>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
          padding: '2px 5px', borderRadius: 999,
          background: t.badgeBg, color: t.badgeFg,
          marginLeft: 2,
        }}>{badge}</span>
      )}
    </div>
  );
}

// ---------- Header ----------
function Header({ t, logoKind, activeMode = 'masonry' }) {
  const modes = [
    { id:'masonry',   label:'Masonry',   icon:I.masonry   },
    { id:'bento',     label:'Bento',     icon:I.bento     },
    { id:'honeycomb', label:'Honeycomb', icon:I.honeycomb },
    { id:'wave',      label:'Wave',      icon:I.wave      },
    { id:'empire',    label:'Empire',    icon:I.empire    },
    { id:'minimal',   label:'Minimal',   icon:I.minimal   },
    { id:'album',     label:'Album',     icon:I.album, badge:'NEW' },
  ];
  return (
    <div style={{
      padding:'14px 20px 10px',
      background: t.headerBg,
      borderBottom: t.headerBorder,
      backdropFilter: t.headerBlur,
    }}>
      {/* top row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius: t.logoRadius,
            background: t.logoBg, display:'grid', placeItems:'center',
            boxShadow: t.logoShadow,
          }}>
            <Logo kind={logoKind} color={t.logoFg} />
          </div>
          <div style={{ lineHeight:1.1 }}>
            <div style={{
              fontFamily: t.brandFont, fontWeight:700, fontSize:14, color:t.fg,
              letterSpacing: t.brandTracking,
            }}>{t.brandName || 'Photo Gallery'}</div>
            <div style={{
              fontFamily: t.monoFont, fontSize:10, color:t.muted,
              letterSpacing:'0.12em', textTransform:'uppercase',
              marginTop:2,
            }}>{t.brandSub || 'demo'}</div>
          </div>
        </div>

        {/* toolbar */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 10px', borderRadius: t.inputRadius,
            background: t.inputBg, border: t.inputBorder,
            fontFamily: t.uiFont, fontSize:11, color: t.muted,
            minWidth: 130,
          }}>
            <span style={{ opacity:.6, fontFamily: t.monoFont, fontSize:10, letterSpacing:'0.1em' }}>PASS</span>
            <span style={{ color: t.mutedDim }}>••••••</span>
          </div>
          <button style={iconBtn(t)}>{I.login}</button>

          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 10px', borderRadius: t.inputRadius,
            background: t.inputBg, border: t.inputBorder,
            fontFamily: t.monoFont, fontSize:11, color: t.fg,
          }}>
            {I.sort}<span>name</span><span style={{ opacity:.5 }}>↑</span>{I.caret}
          </div>

          <button style={{ ...iconBtn(t), background: t.statusBg, color: t.statusFg, borderColor: t.statusBorder }}>
            {I.check}
          </button>
          <button style={iconBtn(t)}>{I.refresh}</button>
          <button style={iconBtn(t)}>{I.sun}</button>
        </div>
      </div>

      {/* mode row */}
      <div style={{ display:'flex', gap:6, marginTop:12, alignItems:'center', overflow:'hidden' }}>
        {modes.map(m => (
          <Chip key={m.id} icon={m.icon} label={m.label}
            active={m.id===activeMode} t={t} badge={m.badge} />
        ))}
      </div>
    </div>
  );
}
function iconBtn(t) {
  return {
    width:28, height:28, display:'grid', placeItems:'center',
    borderRadius: t.inputRadius, background: t.inputBg,
    border: t.inputBorder, color: t.fg, cursor:'pointer',
  };
}

// ---------- Gallery grid ----------
function MasonryGrid({ t, photos }) {
  // compact masonry: 5 cols, varying spans
  const sizes = [
    { col: 'span 2', row: 'span 2' },
    { col: 'span 2', row: 'span 2' },
    { col: 'span 1', row: 'span 2' },
    { col: 'span 2', row: 'span 2' },
    { col: 'span 1', row: 'span 1' },
    { col: 'span 2', row: 'span 2' },
    { col: 'span 1', row: 'span 1' },
    { col: 'span 1', row: 'span 1' },
  ];
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(5, 1fr)',
      gridAutoRows: '80px',
      gap: t.gridGap,
      padding: '14px 20px 20px',
    }}>
      {photos.map((p,i)=>(
        <div key={p.id} style={{
          gridColumn: sizes[i].col, gridRow: sizes[i].row,
          position:'relative', overflow:'hidden',
          borderRadius: t.cardRadius,
          border: t.cardBorder,
          boxShadow: t.cardShadow,
          background:'#000',
        }}>
          <Photo photo={p} h={p.hue} />
          {/* caption strip */}
          {t.captionMode !== 'none' && (
            <div style={{
              position:'absolute', left:0, right:0, bottom:0,
              padding:'6px 8px',
              background: t.captionBg,
              backdropFilter: t.captionBlur,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              fontFamily: t.monoFont, fontSize: 10, color: t.captionFg,
              letterSpacing:'0.04em',
            }}>
              <span style={{ opacity:.9 }}>{p.name}</span>
              {p.fav && (
                <span style={{ color: t.starColor, display:'inline-flex' }}>{I.star}</span>
              )}
            </div>
          )}
          {/* star badge (top-right) for favorites when no caption or cinematic */}
          {p.fav && t.captionMode === 'none' && (
            <div style={{
              position:'absolute', top:8, right:8,
              width:20, height:20, borderRadius:999,
              background: t.starBg, color: t.starColor,
              display:'grid', placeItems:'center',
              boxShadow:'0 2px 6px rgba(0,0,0,0.4)',
            }}>{I.star}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Page counter row ----------
function CountRow({ t, count, note }) {
  return (
    <div style={{
      padding:'10px 20px 0',
      display:'flex', alignItems:'baseline', gap:10,
    }}>
      <div style={{
        fontFamily: t.monoFont, fontSize:10, letterSpacing:'0.16em',
        color: t.muted, textTransform:'uppercase',
      }}>{count} photos</div>
      {note && (
        <div style={{
          flex:1, height:1, background: t.rule, alignSelf:'center',
        }} />
      )}
      {note && (
        <div style={{
          fontFamily: t.monoFont, fontSize:10, letterSpacing:'0.16em',
          color: t.mutedDim, textTransform:'uppercase',
        }}>{note}</div>
      )}
    </div>
  );
}

// ---------- GalleryMock — full screen ----------
function GalleryMock({ theme, logoKind }) {
  return (
    <div style={{
      width:'100%', height:'100%',
      background: theme.pageBg,
      color: theme.fg,
      fontFamily: theme.uiFont,
      display:'flex', flexDirection:'column',
      overflow:'hidden',
    }}>
      <Header t={theme} logoKind={logoKind} />
      <CountRow t={theme} count={PHOTOS.length} note={theme.countNote} />
      <MasonryGrid t={theme} photos={PHOTOS} />
    </div>
  );
}

window.GalleryMock = GalleryMock;
