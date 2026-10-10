import { createFileRoute } from "@tanstack/react-router";

/** Fotos subidas desde el panel (se guardan en la carpeta de datos). */
export const Route = createFileRoute("/media/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { readMedia } = await import("@/server/store");
        const media = await readMedia(params.file);
        if (!media) return new Response("No encontrado", { status: 404 });
        return new Response(media.bytes as unknown as BodyInit, {
          headers: {
            "content-type": media.contentType,
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
