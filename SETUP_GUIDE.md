# Setting Up Eventora — My Notes

Alright, here's how I got this thing running locally. Follow along and you should be up and running in like 15-20 minutes. Most of the pain is just MongoDB Atlas being MongoDB Atlas.

---

## 1. MongoDB Atlas (the database)

I'm using Atlas because it's free and I didn't want to deal with running Mongo locally.

1. Head to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and make an account (or log in if you already have one).
2. Hit **"Build a Database"** → pick the **M0 Sandbox (Free Tier)**. No card needed, thankfully.
3. Pick whatever cloud provider, doesn't really matter (I went with AWS).
4. Now for the annoying-but-necessary part — **Database Access**:
   - Add a new database user, password auth is fine.
   - I used `eventoradmin` / `eventorapassword` — obviously swap this for something less lazy in production. Just remember whatever you pick, you'll need it in a sec.
5. Then **Network Access**:
   - Add IP Address → "Allow Access from Anywhere" (`0.0.0.0/0`). Yeah it's not the most secure option, but it's the only way local + Vercel/Render deployments won't randomly get blocked.
6. Grab your connection string:
   - Go to **Database** → hit **Connect** on your cluster → **Drivers**.
   - Copy the string, looks like:
     `mongodb+srv://eventoradmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Swap `<password>` for your actual password (drop the angle brackets, easy to forget that).

---

## 2. Gmail App Password (for sending emails)

Nodemailer needs this because Gmail won't just let you log in with your normal password once 2FA is on — you need a dedicated app password instead.

1. Go to your [Google Account](https://myaccount.google.com/) → **Security** tab.
2. Turn on **2-Step Verification** if it's not already on.
3. Once that's enabled, search **"App Passwords"** from the Security tab search bar.
4. Generate one — pick "Other," name it "Eventora" or whatever helps you remember what it's for.
5. Copy the 16-character password it spits out. You won't see it again, so don't lose it.

---

## 3. The `.env` file

Open `server/.env` and drop your values in:

```env
# swap in your real password here
MONGO_URI=mongodb+srv://eventoradmin:your_actual_password@cluster0.xxxxx.mongodb.net/eventora?retryWrites=true&w=majority

# just some random secure string
JWT_SECRET=supersecretjwtkey_eventora

# from step 2
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=the_16_character_app_password

PORT=5000
```

---

## 4. Actually running it

**Backend:**
```bash
cd server
npm run dev
```
You'll know it worked if you see:
> `Server running on port 5000`
> `MongoDB Connected`

**Frontend** (new terminal):
```bash
cd client
npm run dev
```
It'll give you a local URL, something like `http://localhost:5173/` — open that up.

---

## 5. Testing everything in Postman

There's a `Eventora_Postman_Collection.json` file in the root — it's basically a pre-built, sequential script covering the whole flow.

1. Open Postman, hit **Import**, drag the JSON file in.
2. Run through it roughly in this order:
   - **Register User** → then **Verify Account OTP** to activate the account.
   - **Login** (saves your token automatically).
   - **Create Event (Admin)** → saves the `event_id`.
   - **Send Booking OTP Request** → check your email for the code.
   - **Verify & Request Booking** → puts the ticket in 'Pending'.
   - **Confirm Booking (Admin - Paid)** → finalizes it, deducts a seat, sends confirmation.
   - Or just **Cancel/Reject Booking** if you want to test that path instead.

That's the whole loop — user signs up, admin creates events, user books, admin confirms. Once you've run through it once end-to-end, you'll have a good feel for how the pieces fit together.