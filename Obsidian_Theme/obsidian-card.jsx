// Card — photo tile with amber hover glow, caption, favorite star.

function Card({ photo, style, showCaption = true, frameNum }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        position:'relative', overflow:'hidden',
        borderRadius: 6,
        border: hover ? '1px solid rgba(230,168,90,0.45)' : '1px solid rgba(255,255,255,0.05)',
        background:'#000',
        transition:'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .2s',
        transform: hover ? 'translateY(-2px) scale(1.006)' : 'translateY(0) scale(1)',
        boxShadow: hover
          ? '0 0 0 3px rgba(230,168,90,0.12), 0 12px 40px -10px rgba(230,168,90,0.25), 0 18px 40px -20px rgba(0,0,0,0.8)'
          : '0 1px 2px rgba(0,0,0,0.4), 0 10px 30px -18px rgba(0,0,0,0.7)',
        cursor:'zoom-in',
        ...style,
      }}>
      <div style={{ position:'absolute', inset:0 }}>
        <window.Photo photo={photo} />
      </div>

      {/* amber top-bar reveal on hover */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:2,
        background: 'linear-gradient(90deg, rgba(230,168,90,0) 0%, #e6a85a 50%, rgba(230,168,90,0) 100%)',
        opacity: hover ? 1 : 0, transition:'opacity .25s',
      }} />

      {/* frame number */}
      {frameNum && (
        <div style={{
          position:'absolute', top:8, left:10,
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'rgba(233,228,217,0.75)', letterSpacing:'0.14em',
          textShadow:'0 1px 2px rgba(0,0,0,0.6)',
        }}>{frameNum}</div>
      )}

      {/* favorite star */}
      {photo.fav && (
        <div style={{
          position:'absolute', top:8, right:8,
          width:20, height:20, borderRadius:999,
          background: 'rgba(11,11,13,0.7)', color:'#e6a85a',
          display:'grid', placeItems:'center',
          backdropFilter:'blur(6px)',
          border:'1px solid rgba(230,168,90,0.3)',
        }}>{window.ICN.star}</div>
      )}

      {/* caption */}
      {showCaption && (
        <div style={{
          position:'absolute', left:0, right:0, bottom:0,
          padding:'18px 10px 6px',
          background:'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)',
          display:'flex', alignItems:'flex-end', justifyContent:'space-between',
          fontFamily:'var(--mono)', fontSize:10, color:'rgba(233,228,217,0.82)',
          letterSpacing:'0.04em',
        }}>
          <span>{photo.name}</span>
          <span style={{
            opacity: hover ? 1 : 0, transition:'opacity .2s',
            color:'rgba(230,168,90,0.85)',
          }}>{photo.exif}</span>
        </div>
      )}
    </div>
  );
}

window.Card = Card;
