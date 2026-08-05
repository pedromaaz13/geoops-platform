export function App() {
  return (
    <main className="app-shell">
      <section className="status-panel" aria-labelledby="geoops-title">
        <p className="eyebrow">GeoOps Platform</p>
        <h1 id="geoops-title">Consola operacional geoespacial</h1>
        <p className="summary">
          Base de desarrollo inicial: API viva, PostGIS preparado, CLI de ingesta smoke y
          frontend listo para el primer corte vertical.
        </p>
        <dl className="readiness-list" aria-label="Estado del bootstrap">
          <div>
            <dt>Dominio</dt>
            <dd>Sin modelos ni fuentes reales todavía</dd>
          </div>
          <div>
            <dt>Primer corte</dt>
            <dd>Incendios de extremo a extremo</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
