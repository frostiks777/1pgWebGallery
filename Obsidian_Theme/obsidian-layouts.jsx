// Layout variants. Each returns a grid of cards sized to ~1280px container.
// Compact density — max photos on screen.

const P = () => window.PHOTOS;
const C = (props) => React.createElement(window.Card, props);

// Helper: style for grid area
const area = (col, row) => ({ gridColumn: col, gridRow: row });

// Masonry — irregular grid, 5 columns
function MasonryLayout() {
  const sizes = [
    area('span 2','span 2'),
    area('span 2','span 2'),
    area('span 1','span 2'),
    area('span 2','span 2'),
    area('span 1','span 1'),
    area('span 2','span 2'),
    area('span 1','span 1'),
    area('span 1','span 1'),
  ];
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(5, 1fr)',
      gridAutoRows:'92px',
      gap:8,
    }}>
      {P().map((p,i) => (
        <div key={p.id} style={sizes[i]}>
          {C({ photo:p, style:{ width:'100%', height:'100%' }, frameNum: String(i+1).padStart(2,'0')+'/08' })}
        </div>
      ))}
    </div>
  );
}

// Bento — hero + smaller cells
function BentoLayout() {
  const sizes = [
    area('span 3','span 3'),  // hero
    area('span 2','span 2'),
    area('span 2','span 2'),
    area('span 2','span 3'),
    area('span 2','span 2'),
    area('span 3','span 2'),
    area('span 2','span 2'),
    area('span 2','span 3'),
  ];
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(9, 1fr)',
      gridAutoRows:'62px',
      gap:8,
    }}>
      {P().map((p,i) => (
        <div key={p.id} style={sizes[i]}>
          {C({ photo:p, style:{ width:'100%', height:'100%' }, frameNum: String(i+1).padStart(2,'0')+'/08' })}
        </div>
      ))}
    </div>
  );
}

// Album — mat-board cards with framed captions, mixed sizes
function AlbumLayout() {
  const sizes = [
    area('span 2','span 3'),
    area('span 1','span 2'),
    area('span 1','span 2'),
    area('span 1','span 2'),
    area('span 1','span 2'),
    area('span 1','span 2'),
    area('span 1','span 2'),
    area('span 2','span 3'),
  ];
  return (
    <div>
      <div style={{
        textAlign:'center', padding:'12px 0 18px',
      }}>
        <div style={{
          fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.4em',
          color:'rgba(233,228,217,0.55)', textTransform:'uppercase',
        }}>— A L B U M —</div>
        <div style={{
          fontFamily:'var(--serif)', fontSize:24, color:'#e9e4d9',
          marginTop:6, fontStyle:'italic',
        }}>Vol. 01 · Eight Frames</div>
      </div>
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(6, 1fr)',
        gridAutoRows:'88px',
        gap:14,
      }}>
        {P().map((p,i) => (
          <div key={p.id} style={{
            ...sizes[i],
            background:'#141311',
            padding:'8px 8px 28px',
            borderRadius:8,
            border:'1px solid rgba(255,255,255,0.05)',
            boxShadow:'0 1px 2px rgba(0,0,0,0.4), 0 18px 40px -20px rgba(0,0,0,0.7)',
            position:'relative',
            transition:'transform .2s, border-color .2s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(230,168,90,0.35)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; }}
          >
            <div style={{ width:'100%', height:'calc(100% - 20px)', position:'relative' }}>
              {C({ photo:p, style:{ width:'100%', height:'100%' }, showCaption:false })}
            </div>
            <div style={{
              position:'absolute', left:10, bottom:7,
              fontFamily:'var(--mono)', fontSize:9,
              color:'rgba(233,228,217,0.65)',
              letterSpacing:'0.05em',
            }}>{p.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Honeycomb — hex grid, 6 visible (compact)
function HoneycombLayout() {
  const hexes = P().slice(0, 8).map((p,i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const offsetX = row % 2 ? 90 : 0;
    return { p, x: col*172 + offsetX, y: row*148 };
  });
  return (
    <div style={{ position:'relative', height: 320, paddingLeft: 20 }}>
      {hexes.map(({p,x,y}) => (
        <div key={p.id} style={{
          position:'absolute', left:x, top:y,
          width:170, height:196,
          clipPath:'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          transition:'transform .2s',
          cursor:'zoom-in',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='scale(1.04)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; }}
        >
          <window.Photo photo={p} />
          {p.fav && (
            <div style={{
              position:'absolute', top:'14%', right:'14%',
              color:'#e6a85a', textShadow:'0 1px 2px rgba(0,0,0,0.7)',
            }}>{window.ICN.star}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Wave — staggered Y offsets
function WaveLayout() {
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(8, 1fr)',
      gap:8,
      alignItems:'center',
    }}>
      {P().map((p,i) => {
        const offset = Math.sin((i/7) * Math.PI * 1.5) * 28;
        return (
          <div key={p.id} style={{
            height: 180,
            transform: `translateY(${offset}px)`,
          }}>
            {C({ photo:p, style:{ width:'100%', height:'100%', borderRadius:14 }, showCaption:false })}
          </div>
        );
      })}
    </div>
  );
}

// Empire — central hero with circling tiles
function EmpireLayout() {
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'1fr 2fr 1fr',
      gridTemplateRows:'1fr 1fr',
      gap:10,
      height: 420,
    }}>
      <div style={{ gridColumn:'1', gridRow:'1 / span 2' }}>
        <div style={{ display:'grid', gap:10, height:'100%', gridTemplateRows:'1fr 1fr' }}>
          {C({ photo:P()[1], style:{ width:'100%', height:'100%' }, showCaption:false })}
          {C({ photo:P()[2], style:{ width:'100%', height:'100%' }, showCaption:false })}
        </div>
      </div>
      <div style={{ gridColumn:'2', gridRow:'1 / span 2' }}>
        {C({ photo:P()[0], style:{ width:'100%', height:'100%' }, frameNum:'HERO' })}
      </div>
      <div style={{ gridColumn:'3', gridRow:'1 / span 2' }}>
        <div style={{ display:'grid', gap:10, height:'100%', gridTemplateRows:'1fr 1fr 1fr' }}>
          {C({ photo:P()[3], style:{ width:'100%', height:'100%' }, showCaption:false })}
          {C({ photo:P()[4], style:{ width:'100%', height:'100%' }, showCaption:false })}
          {C({ photo:P()[5], style:{ width:'100%', height:'100%' }, showCaption:false })}
        </div>
      </div>
    </div>
  );
}

// Minimal — single column, wide
function MinimalLayout() {
  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:4,
      maxWidth:820, margin:'0 auto',
    }}>
      {P().map((p,i) => (
        <div key={p.id} style={{
          display:'grid', gridTemplateColumns:'60px 1fr 140px',
          alignItems:'center', gap:16,
          padding:'10px 0',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          fontFamily:'var(--mono)', fontSize:11,
          color:'rgba(233,228,217,0.75)',
          transition:'color .2s',
          cursor:'pointer',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.color='#e6a85a'; }}
        onMouseLeave={e=>{ e.currentTarget.style.color='rgba(233,228,217,0.75)'; }}
        >
          <div style={{ letterSpacing:'0.16em', opacity:.55 }}>
            {String(i+1).padStart(2,'0')}
          </div>
          <div style={{ letterSpacing:'0.04em' }}>
            {p.name}
            {p.fav && <span style={{ marginLeft:8, color:'#e6a85a' }}>★</span>}
          </div>
          <div style={{ textAlign:'right', opacity:.55, fontSize:10 }}>
            {p.exif}
          </div>
        </div>
      ))}
    </div>
  );
}

window.LAYOUTS = {
  masonry: MasonryLayout,
  bento: BentoLayout,
  honeycomb: HoneycombLayout,
  wave: WaveLayout,
  empire: EmpireLayout,
  minimal: MinimalLayout,
  album: AlbumLayout,
};
