import { useEffect, useState } from 'react';

const REPO = 'dashedthoughts/portfolio';
const IMG = /\.(jpe?g|png|gif|webp|avif)$/i;

// Reads /photos from the repo at runtime: dropping a file in that folder is all it takes.
export default function PhotoStrip() {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}/contents/photos`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) =>
        setPhotos(
          (Array.isArray(list) ? list : [])
            .filter((f) => IMG.test(f.name))
            .slice(0, 16)
            .map((f) => ({ src: f.download_url, name: f.name })),
        ),
      )
      .catch(() => {});
  }, []);
  const items = photos.length ? photos : Array.from({ length: 5 }, () => null);
  const loop = [...items, ...items];
  return (
    <div className="photos">
      <div className="photos__track" style={{ '--count': items.length }}>
        {loop.map((p, i) => (
          <figure className="photo" key={i} aria-hidden={i >= items.length ? 'true' : undefined}>
            {p ? (
              <img src={p.src} alt={p.name.replace(IMG, '').replace(/[-_]/g, ' ')} loading="lazy" />
            ) : (
              <span className="photo__empty">
                NO SIGNAL
                <br />
                /photos
              </span>
            )}
            <figcaption>CAM {String((i % items.length) + 1).padStart(2, '0')}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
