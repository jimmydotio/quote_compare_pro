const express = require('express');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const db = require('better-sqlite3')('quotes.db');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

db.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stripe_id TEXT,
        amount INTEGER,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

app.get('/create-checkout-session', async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('PLACEHOLDER')) {
            return res.status(500).send("Update your .env file with a real Stripe Secret Key.");
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.DOMAIN}/success.html`,
            cancel_url: `${process.env.DOMAIN}/`,
        });

        const stmt = db.prepare('INSERT INTO orders (stripe_id, amount, status) VALUES (?, ?, ?)');
        stmt.run(session.id, 2600, 'pending');

        res.redirect(303, session.url);
    } catch (e) {
        console.error("Stripe Error:", e.message);
        res.status(500).send(`Server Error: ${e.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Rocket ship Engine Active on Port " + PORT);
});
