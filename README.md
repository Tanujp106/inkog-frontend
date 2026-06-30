This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Local development uses exactly two app ports:

- Frontend: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Backend API and Socket.IO: [http://127.0.0.1:3001](http://127.0.0.1:3001)

No extra local app ports should be required by default. Agentation stays off unless `NEXT_PUBLIC_ENABLE_AGENTATION=true` is explicitly set.
The frontend dev server writes to `.next-dev`, while `npm run build` writes to `.next`, so verification builds will not corrupt a running local dev server.

First, run the backend:

```bash
cd ../inkog-backend
npm run dev
```

Then run the frontend:

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) with your browser to see the result.

The dev and start scripts are locked to `127.0.0.1:3000` for the frontend and `127.0.0.1:3001` for the backend. If either port is busy, the command now fails with a clear error instead of silently creating a new port or shifting to another port.

Use [http://127.0.0.1:3000/playground](http://127.0.0.1:3000/playground) to compare the two supported UI directions:

- Direction 1 mirrors the live homepage flow.
- Direction 2 shows the alternate shell-based entry flow.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
