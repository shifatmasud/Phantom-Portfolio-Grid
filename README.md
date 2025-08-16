# Interactive WebGL Grid - README (Explain Like I'm 5 Version)

Hello new developer! Welcome to this fun project. It might look complex, but it's like building with LEGOs. Here’s a simple map of how it all fits together.

## The Big Picture: What is this?

This is a fancy, interactive grid of projects that uses WebGL (via Three.js) to make it look cool and feel alive. Instead of a boring list, we have a dynamic grid you can pan, zoom, and hover over.

---

## The LEGO Pieces (Our Code Files)

Think of our code as different types of LEGO bricks, each with a special job.

### 1. The Main LEGO Set: `App.tsx`
- **What it is:** This is the main box for our LEGO set.
- **Job:** It sets up the page, adds the title, and puts our `InteractiveGrid` component on the screen. It also passes in the project data (like titles and images).

### 2. The Master Build: `components/InteractiveGrid/index.tsx`
- **What it is:** This is the final, assembled LEGO creation.
- **Job:** It's the React component you see. It takes all the complicated logic from our "instruction manual" (`useInteractiveGrid.ts`) and uses it to render the grid and the "View Project" link. It doesn't do much thinking itself; it just shows things.

### 3. The Instruction Manual: `components/InteractiveGrid/useInteractiveGrid.ts`
- **What it is:** This is the most important file for you to understand! It's the master instruction manual that tells all the other pieces what to do.
- **Job:** It calls all our other special "hooks" (the small instruction booklets) and connects them together. If you want to see how everything is orchestrated, start here.

### 4. The Special Instruction Booklets (The `hooks` folder)
These are small, focused guides for specific tasks.

-   **`useThreeSetup.ts` (The Foundation)**: This booklet tells you how to lay down the green LEGO baseplate. It sets up the basic 3D world (scene, camera, renderer). This happens only once.

-   **`useTextureManager.ts` (The Sticker Sheet)**: This one shows how to prepare the cool stickers for our LEGOs. It loads all the project images and writes the project titles onto special textures for the GPU.

-   **`useAnimationLoop.ts` (The Heartbeat)**: This is the magic part that makes our creation "live". It's a loop that runs on every frame to create smooth movement, handle physics, and render the final image.

-   **`useEventHandlers.ts` (The Buttons & Levers)**: This explains how to handle user actions. When you click, drag, or scroll, this hook listens for it and tells other parts what to do.

-   **`useInteraction.ts` (The Playbook)**: This booklet defines the *rules* of interaction. What happens when you tap a cell? You zoom in. What happens when you swipe? You move to the next project.

-   **`useVideoManager.ts` (The Mini TV)**: This one is in charge of the little video previews that play when you hover over a project.

-   **...and a few others!** Each hook has a clear name and comments explaining its job.

### 5. The Magic Spellbook: `shaders.ts`
- **What it is:** This file is written in a different language (GLSL), not JavaScript. It's a set of instructions that runs directly on your computer's GPU (the graphics card).
- **Job:** This is what draws *everything* you see inside the grid—the lines, the images, the text, and all the cool distortion and hover effects. It's powerful but can be tricky. We've added lots of comments to help you understand it.

### 6. The Control Panel: `config.ts`
- **What it is:** This is the best place to start having fun!
- **Job:** It’s a file full of easy-to-change settings. Want the zoom to be faster? Want the grid to feel "bouncier"? Just change a number in this file and see what happens. **No complex coding required!**

---

## How to Explore
1.  Start by opening `config.ts` and changing some values. It's the safest and most fun way to see how things work.
2.  Next, look at `useInteractiveGrid.ts` to see how all the hooks are connected.
3.  Then, dive into any individual hook in the `hooks` folder that interests you.
4.  Finally, if you're feeling brave, take a peek at `shaders.ts` to see how the graphics are made.

Have fun exploring!
