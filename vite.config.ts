import { sveltekit } from "@sveltejs/kit/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  plugins: [enhancedImages(), sveltekit()],
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), "blogs"],
    },
  },
});
