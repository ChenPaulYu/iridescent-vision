# Iridescent Vision – Narrative Sketch

## Core Narrative Beats
1. **Awakening (Primitive Age)**
   - Environment: dim, organic fibers gently pulsing like roots.
   - Symbolism: the goddess head materializes from rough stone; audio uses percussive, earthy textures.
   - Interaction: user triggers the awakening by starting the experience; visuals emphasize emergence.

2. **Ascension (Agrarian → Industrial)**
   - Fibers shift into structured patterns resembling weaving or architecture.
   - SoftVolume + GlassSkin transition adds metallic glints to indicate tool-making.
   - Camera remains centered on the mask while the tunnel widens, giving a sense of collective movement forward.

3. **Orbit (Post-Tech Era)**
   - Background accelerates upward; fibers adopt luminous gradients, referencing circuitry and neural pathways.
   - Gravity mode introduces floating orbs representing knowledge nodes orbiting the goddess.
   - SoundHandler cues crystalline tones; key flashes align with timeline bump events.

4. **Reflection (Looping Future)**
   - Scene desaturates toward deep purples; fibers curl inward forming a womb-like chamber.
   - HeadMove enters “shake/flake” states to suggest self-questioning.
   - Final transition repeats the initial organic textures, implying cyclical rebirth.

## Visual Motifs
- **Goddess Head**: Constant anchor; lighting changes per era (warm firelight → metallic sheens → iridescent rim light).
- **Fiber Tunnel**: Represents civilization’s path. Parameters (density, curvature, glow) respond to soundtrack sections.
- **Flashes & Particles**: Triggered via SoundHandler schedules to mark pivotal historical beats.

## Interaction Hooks
- Start button initiates the timeline and fades in the forest.
- Optional keyboard shortcuts remain for debugging but narrative flow should work hands-free.
- Potential UI overlay (future work): subtle captions per era, appearing in sync with SoundHandler events.

## Audio Coordination Ideas
- Map Tone.Transport markers to the four beats above.
- Introduce subtle reverb/low-pass automation when fibers close in, symbolizing introspection.
- Layer distant chants or field recordings during the Awakening to ground the primitive setting.

## Next Steps
1. Encode these beats into a timeline config (JSON) to drive visual state changes.
2. Extend FiberForestBackground to expose controls for density, tint, and curve strength per beat.
3. Design a minimal overlay (TextLayer update) that can display era titles without breaking immersion.
