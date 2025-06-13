require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Setup Stripe & Supabase
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Plan limits by ID
const PLAN_LIMITS = {
  'pro_plan':   { daily_actions: 10000, ig_accounts: 5, funnel_stages: 10 },
  'elite_plan': { daily_actions: 20000, ig_accounts: 10, funnel_stages: 20 }
};

// Stripe Webhook Handler
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const stripeCustomerId = session.customer;

    const plan_id = session.metadata?.plan_id || 'elite_plan';
    const price_id = session.metadata?.price_id || null;
    const limits = PLAN_LIMITS[plan_id] || PLAN_LIMITS['elite_plan'];

    let dbUser;
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('👤 User already exists:', email);
      dbUser = existingUser;
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          email,
          stripe_customer_id: stripeCustomerId,
          plan_id,
          price_id,
          daily_actions: limits.daily_actions,
          ig_accounts: limits.ig_accounts,
          funnel_stages: limits.funnel_stages
        }])
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
      }
      dbUser = newUser;
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true
    });

    if (authError) {
      console.error('Auth creation error:', authError);
    } else {
      console.log('✅ Supabase auth user created:', authUser.user.id);
    }

    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: 'https://story-blast-funnel-flow.lovable.app/dashboard'
      }
    });

    if (tokenError) {
      console.error('Token generation error:', tokenError);
    } else {
      console.log('✅ Magic login link:', tokenData.action_link);
    }

    return res.status(200).json({
      received: true,
      magic_link: tokenData?.action_link
    });
  }

  res.status(200).json({ received: true });
});

module.exports = router;





