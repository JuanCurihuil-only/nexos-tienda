import { createFileRoute } from "@tanstack/react-router";

/** Fotos subidas desde el panel (se guardan en la carpeta de datos). */
export const Route = createFileRoute("/media/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { readMedia } = await import("@/server/store");
        const bytes = await readMedia(params.file);
        if (!bytes) return new Response("No encontrado", { status: 404 });
        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "content-type": "image/webp",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
