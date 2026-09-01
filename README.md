# JAZZHQ Bloom

Turn any link into a configurable interactive 3D bloom.

## Rendering architecture

- The creator and recipient experiences render through React Three Fiber's real `<Canvas>` and a Three.js WebGL renderer.
- Peony, Rose, Lily, Tulip, and Mixed use distinct procedural 3D petal geometry and different bouquet layouts.
- Repeated petals, stems, leaves, stamens, flower centres, and QR modules use `THREE.InstancedMesh` with shared geometry and materials.
- One reversible progress value drives the bouquet fragments and the QR module grid. The final 7% adds a mathematically exact canvas QR for scan reliability.
- Constrained OrbitControls support pointer and touch rotation without pan or zoom.

## Product flow

The default route is the creator. It configures the destination URL, recipient, sender, optional message, bouquet type, and palette. Creating a bloom produces a recipient URL containing the same configuration.

Recipient URLs use `?view=recipient` and keep JAZZHQ Bloom branding small so the bouquet remains the hero.

Open `?debug=true` to inspect renderer, scene, instance and FPS diagnostics, scrub the morph, switch all bouquet presets, and decode the final QR.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/` for the creator or `http://localhost:3000/?debug=true` for verification controls.
