# Welcome to Remix + Vite!

📖 See the [Remix docs](https://remix.run/docs) and the [Remix Vite docs](https://remix.run/docs/en/main/guides/vite) for details on supported features.

## Development

Run the Vite dev server:

```shellscript
npm run dev
```

## D1 migrations
D1 migrations will be generated using drizzle, you can find all the migrations in `/drizzle` directory.

To generate these migrations you need to run:

```sh
npx drizzle-kit generate
```

In order to apply these migrations to D1 local database you need to run:

```sh
npx wrangler d1 migrations apply "name-of-your-database"
```

In order to apply these migrations to D1 remote database you need to run:

```sh
npx drizzle-kit migrate
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`
