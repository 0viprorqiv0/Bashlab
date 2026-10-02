'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './checkout.module.css';
import { supabase } from '@/lib/supabaseClient';

// --- Stripe / Payment Brand Icons ---

function StripeWordmark() {
  return (
    <svg viewBox="0 0 60 25" width="46" height="20" fill="currentColor" aria-label="Stripe" className={styles.stripeLogoSvg}>
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v2.85c-1.25.62-2.89.92-4.63.92-4.24 0-6.62-2.7-6.62-6.92 0-3.97 2.37-6.94 6.25-6.94 4.05 0 5.81 3.03 5.81 6.83 0 .58-.02 1.25-.06 1.66h.06zm-4.06-2.5c-.07-1.46-.86-2.34-2.22-2.34-1.33 0-2.19.88-2.35 2.34h4.57zM38.86 19.35l-3.34-10.45h3.93l1.83 6.94 2.1-6.94h3.76l-3.69 11.23c-.93 2.8-2.45 3.93-5.04 3.93-1.03 0-1.92-.17-2.52-.45v-2.82c.48.2 1.09.33 1.69.33 1.05 0 1.66-.46 2.1-1.77h-.82zM28.43 5.8c-1.07 0-1.92.35-2.47.88v-4.8h-3.79v17.47h3.79v-7.23c0-2.07 1.12-3.15 2.59-3.15.54 0 1.05.13 1.39.29v-3.23c-.41-.15-.97-.23-1.51-.23zm-10.4 13.55h-3.79v-13.6h3.79v13.6zm-1.89-15.42c-1.31 0-2.31-.97-2.31-2.23 0-1.29 1-2.26 2.31-2.26s2.31.97 2.31 2.26c0 1.26-1 2.23-2.31 2.23zm-7.9 15.74c-3.11 0-4.99-1.44-5.74-2.36l1.86-2.23c.66.72 1.95 1.7 3.73 1.7 1.48 0 2.37-.63 2.37-1.52 0-2.28-6.97-1.25-6.97-6.29 0-2.91 2.35-4.87 5.79-4.87 2.45 0 4.19.98 5.09 1.79l-1.73 2.26c-.72-.63-1.84-1.22-3.2-1.22-1.29 0-2.07.57-2.07 1.34 0 2.22 6.97 1.17 6.97 6.27 0 3.03-2.48 5.13-6.1 5.13z"/>
    </svg>
  );
}

function VisaBadge({ active = false, detected = false }) {
  return (
    <svg viewBox="0 0 36 12" width="30" height="11" fill="none" className={`${styles.cardBrandSvg} ${detected ? styles.cardBrandActive : ''}`}>
      <path d="M14.5 11.2L16.7.8h2.7l-2.2 10.4h-2.7zM26.8 1.1c-.6-.2-1.5-.4-2.6-.4-2.8 0-4.8 1.5-4.8 3.6 0 1.6 1.4 2.5 2.5 3 1.1.5 1.5.9 1.5 1.4 0 .8-.9 1.1-1.8 1.1-1.2 0-1.8-.2-2.8-.6l-.4-.2-.4 2.5c.7.3 2 .6 3.3.6 3.1 0 5.1-1.5 5.1-3.8 0-1.3-.8-2.2-2.5-3-1.1-.5-1.7-.9-1.7-1.4 0-.5.6-.9 1.7-.9.9 0 1.6.2 2.2.4l.3.1.4-2.4zm8.7 0h-2.1c-.7 0-1.2.2-1.5.9l-4.2 9.2h2.9l.6-1.6h3.5l.3 1.6h2.5l-2-10.1zm-3.2 6.2l1.4-4 .8 4h-2.2zm-19.6-6.2l-2.6 7.1-.3-1.4c-.5-1.7-2.1-3.6-3.9-4.5l2.5 9.1h2.9l4.3-10.3h-2.9z" fill="#2563eb" />
      <path d="M4.6 1.1H.1L0 1.7c3.5.9 5.8 3 6.7 5.6L5.8 2c-.2-.6-.6-.9-1.2-.9z" fill="#f59e0b" />
    </svg>
  );
}

function MastercardBadge({ detected = false }) {
  return (
    <svg viewBox="0 0 28 18" width="22" height="14" fill="none" className={`${styles.cardBrandSvg} ${detected ? styles.cardBrandActive : ''}`}>
      <circle cx="9" cy="9" r="8" fill="#EB001B" />
      <circle cx="19" cy="9" r="8" fill="#F79E1B" fillOpacity="0.82" />
    </svg>
  );
}

function AmexBadge({ detected = false }) {
  return (
    <span className={`${styles.amexBadge} ${detected ? styles.cardBrandActive : ''}`}>
      AMEX
    </span>
  );
}

function ApplePayIcon() {
  return (
    <svg viewBox="0 0 46 18" width="46" height="18" fill="currentColor">
      <path d="M7.7 7.7c-.5.6-1.3 1-2.1 1-.1-1 .3-1.9.8-2.5.5-.6 1.4-1 2.2-1.1.1 1-.4 2-.9 2.6zm.9 1.4c-1.2-.1-2.3-.8-2.9-.8-.6 0-1.5.7-2.5.7-1.3 0-2.5-.7-3.2-1.9-1.4-2.4-.4-6 1-7.9.7-1 1.8-1.6 2.9-1.6 1.1 0 2.2.8 2.9.8.6 0 1.9-.8 3.2-.8 1.1 0 2.1.6 2.7 1.4-2.4 1.4-2 4.7.4 5.7-.5 1.5-1.3 3.1-2.5 4.5-.6.7-1.3 1.2-2 1.2zm8.7 5.1h-2.1V2.8h4.4c2.5 0 4.1 1.6 4.1 3.7 0 2.2-1.6 3.7-4.1 3.7h-2.3v4zm0-6.1h2.2c1.4 0 2.2-.8 2.2-1.9 0-1.1-.8-1.9-2.2-1.9h-2.2v3.8zm14.3 6.1l-.3-1.6c-.6 1.1-1.7 1.8-3.1 1.8-2 0-3.3-1.3-3.3-3.2 0-2.1 1.6-3.2 4.4-3.3l2-.1v-.5c0-1-.7-1.6-1.9-1.6-1.1 0-1.8.4-2.1 1.3l-1.8-.5c.6-1.5 1.9-2.2 3.9-2.2 2.3 0 3.8 1.2 3.8 3.2v6.7h-1.6zm-2.9-1.5c1.4 0 2.6-.9 2.6-2.1v-.8l-1.8.1c-1.6.1-2.5.6-2.5 1.7 0 .9.7 1.5 1.7 1.5zm8.9 4.3l3.5-10.4h2.2l-5.1 14.1h-2.1l1.8-4.5-3.3-9.6h2.2l2.3 6.9 1.1-3.5-2.6-3.4z" />
    </svg>
  );
}

function GooglePayIcon() {
  return (
    <svg viewBox="0 0 46 18" width="46" height="18">
      <path d="M7.8 7.3v2.8h5.3c-.2 1.3-1.5 3.8-5.3 3.8-3.2 0-5.8-2.7-5.8-5.9s2.6-5.9 5.8-5.9c1.8 0 3.1.8 3.8 1.5l2.2-2.1C12.4.2 10.3-.7 7.8-.7 3.5-.7 0 2.8 0 7.1s3.5 7.8 7.8 7.8c4.5 0 7.5-3.2 7.5-7.6 0-.5-.1-.9-.1-1.3H7.8v1.3z" fill="#fff"/>
      <path d="M22.1 14.5V2.8h-3v11.7h3z" fill="#fff"/>
      <path d="M28.4 6.8c-2.4 0-4.1 1.8-4.1 4.1 0 2.4 1.7 4.1 4.1 4.1s4.1-1.8 4.1-4.1c0-2.4-1.7-4.1-4.1-4.1zm0 6.6c-1.3 0-2.4-1.1-2.4-2.5s1.1-2.5 2.4-2.5 2.4 1.1 2.4 2.5-1.1 2.5-2.4 2.5z" fill="#fff"/>
      <path d="M41.4 6.8l-3.8 9.6h-2.1l1.4-3.1-2.5-6.5h2.2l1.4 4.3 1.4-4.3h2z" fill="#fff"/>
    </svg>
  );
}

export default function CheckoutPage() {
  // Plan & Billing
  const [billingCycle, setBillingCycle] = useState('annual'); // 'annual' | 'monthly'
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'qr' | 'paypal'

  // Contact & Learner Info
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('VN');
  const [postalCode, setPostalCode] = useState('');

  // Consolidated Card Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Link 1-click option
  const [saveWithLink, setSaveWithLink] = useState(true);

  // Coupon / Promo
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Submission & Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Auto-detect Card Brand
  const detectBrand = (val) => {
    const clean = val.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^(34|37)/.test(clean)) return 'amex';
    return null;
  };
  const activeBrand = detectBrand(cardNumber);

  // Auto-format card number in 4s
  const handleCardNumberChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Auto-format MM / YY
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // CVC max 4 digits
  const handleCvcChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
  };

  // Load Supabase user if logged in
  useEffect(() => {
    async function loadUser() {
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.email) setEmail(user.email);
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.name) setFullName(profile.name);
        }
      } catch (err) {
        // fallback
      }
    }
    loadUser();
  }, []);

  // Pricing
  const basePrice = billingCycle === 'annual' ? 89 : 9;
  const discountAmount = couponApplied ? (billingCycle === 'annual' ? 20 : 2) : 0;
  const totalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const clean = couponCode.trim().toUpperCase();
    if (clean === 'STUDENT' || clean === 'BASHLAB20' || clean === 'DEV') {
      setCouponApplied(true);
      setCouponError('');
    } else {
      setCouponError('Invalid code. Try "STUDENT"');
    }
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      alert('Please provide your email address.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const generatedId = `pi_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString().slice(-4)}`;
      setOrderId(generatedId);
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1100);
  };

  return (
    <div className={styles.container}>
      {/* Stripe-style 2-Column Split Checkout */}
      <div className={styles.stripeCheckoutBox}>
        {/* Left Column: Stripe Product & Order Summary Panel */}
        <div className={styles.summaryPanel}>
          <div className={styles.summaryPanelInner}>
            {/* Return Link & Brand Header */}
            <div className={styles.brandRow}>
              <Link href="/subscription" className={styles.backLink}>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 13L5 8l5-5" />
                </svg>
                <span>Return to BashLab</span>
              </Link>
            </div>

            <div className={styles.productMeta}>
              <span className={styles.subscribingTag}>Subscribe to</span>
              <h1 className={styles.productTitle}>Individual Plan</h1>
              
              <div className={styles.heroPriceRow}>
                <span className={styles.currencySymbol}>$</span>
                <span className={styles.heroAmount}>{totalPrice}</span>
                <span className={styles.heroDecimal}>.00</span>
                <span className={styles.heroInterval}>
                  per {billingCycle === 'annual' ? 'year' : 'month'}
                </span>
              </div>

              {/* Billing Cycle Switcher Pills */}
              <div className={styles.cycleSwitchPill}>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`${styles.cyclePillBtn} ${billingCycle === 'annual' ? styles.cyclePillActive : ''}`}
                >
                  <span>Yearly</span>
                  <span className={styles.saveTag}>Save 20%</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`${styles.cyclePillBtn} ${billingCycle === 'monthly' ? styles.cyclePillActive : ''}`}
                >
                  <span>Monthly</span>
                </button>
              </div>
            </div>

            {/* Line Items Breakdown */}
            <div className={styles.lineItemsList}>
              <div className={styles.lineItem}>
                <span>Individual Plan ({billingCycle === 'annual' ? '12 Months' : 'Monthly'})</span>
                <span className={styles.lineItemPrice}>${basePrice}.00</span>
              </div>

              {couponApplied && (
                <div className={`${styles.lineItem} ${styles.discountItem}`}>
                  <span>Promotion (STUDENT -20%)</span>
                  <span>-${discountAmount}.00</span>
                </div>
              )}

              <div className={styles.lineItemDivider} />

              <div className={styles.lineItemTotal}>
                <span className={styles.totalLabel}>Total due today</span>
                <span className={styles.totalValue}>${totalPrice}.00</span>
              </div>
            </div>

            {/* Included Features List */}
            <div className={styles.perksBox}>
              <div className={styles.perk}>
                <svg className={styles.perkIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 8 6.5 11.5 13 4.5" />
                </svg>
                <span>Full root sandboxes &amp; unlimited compute hours</span>
              </div>
              <div className={styles.perk}>
                <svg className={styles.perkIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 8 6.5 11.5 13 4.5" />
                </svg>
                <span>40+ Security challenges, CTFs &amp; real bash scenarios</span>
              </div>
              <div className={styles.perk}>
                <svg className={styles.perkIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 8 6.5 11.5 13 4.5" />
                </svg>
                <span>Verified certification badge &amp; persistent home directory</span>
              </div>
            </div>

            {/* Guaranteed safe checkout */}
            <div className={styles.guaranteeFoot}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>30-day money-back guarantee • Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Right Column: Stripe Payment Form */}
        <div className={styles.paymentPanel}>
          <form onSubmit={handleSubmitOrder} className={styles.paymentForm}>
            {/* Express Checkout: Apple Pay / Google Pay / Link */}
            <div className={styles.expressSection}>
              <button
                type="button"
                className={styles.expressBtn}
                onClick={() => {
                  setIsSubmitting(true);
                  setTimeout(() => {
                    setOrderId(`pi_express_${Date.now().toString().slice(-6)}`);
                    setIsSubmitting(false);
                    setIsSuccess(true);
                  }, 900);
                }}
              >
                <ApplePayIcon />
                <span className={styles.expressDivider}>/</span>
                <GooglePayIcon />
              </button>
            </div>

            <div className={styles.orDivider}>
              <span>Or pay with card</span>
            </div>

            {/* Contact Information */}
            <div className={styles.fieldSection}>
              <label className={styles.stripeLabel} htmlFor="stripe-email">
                Contact information
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="stripe-email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  className={styles.stripeInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className={styles.fieldSection}>
              <label className={styles.stripeLabel}>
                Payment method
              </label>
              <div className={styles.methodTabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={paymentMethod === 'card'}
                  className={`${styles.methodTab} ${paymentMethod === 'card' ? styles.methodTabActive : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={paymentMethod === 'qr'}
                  className={`${styles.methodTab} ${paymentMethod === 'qr' ? styles.methodTabActive : ''}`}
                  onClick={() => setPaymentMethod('qr')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>VietQR</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={paymentMethod === 'paypal'}
                  className={`${styles.methodTab} ${paymentMethod === 'paypal' ? styles.methodTabActive : ''}`}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 13l2.5-10h6.5a4 4 0 0 1 0 8h-4.5l-1 5" />
                    <path d="M7 21l2.5-10h5.5a4 4 0 0 1 0 8h-4.5l-1 5" />
                  </svg>
                  <span>PayPal</span>
                </button>
              </div>
            </div>

            {/* Card Information - Stripe Signature Nested Card Element */}
            {paymentMethod === 'card' && (
              <div className={styles.cardSection}>
                <label className={styles.stripeLabel}>Card information</label>
                
                <div className={styles.consolidatedCardBox}>
                  {/* Card Number Row */}
                  <div className={styles.cardNumRow}>
                    <input
                      type="text"
                      required
                      placeholder="1234 1234 1234 1234"
                      className={styles.cardInputTop}
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                    />
                    <div className={styles.cardBrandsWrap}>
                      <VisaBadge detected={activeBrand === 'visa'} />
                      <MastercardBadge detected={activeBrand === 'mastercard'} />
                      <AmexBadge detected={activeBrand === 'amex'} />
                    </div>
                  </div>

                  {/* Split Expiry & CVC Row */}
                  <div className={styles.cardSplitRow}>
                    <div className={styles.cardHalfCol}>
                      <input
                        type="text"
                        required
                        placeholder="MM / YY"
                        className={styles.cardInputSub}
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                      />
                    </div>
                    <div className={styles.cardHalfCol}>
                      <input
                        type="password"
                        required
                        placeholder="CVC"
                        maxLength="4"
                        className={styles.cardInputSub}
                        value={cardCvc}
                        onChange={handleCvcChange}
                      />
                      <svg className={styles.cvcIcon} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Cardholder Name & Country / Postal Code */}
                <div className={styles.billingGrid}>
                  <div className={styles.billingColFull}>
                    <label className={styles.stripeLabelSm} htmlFor="card-name">Cardholder name</label>
                    <input
                      id="card-name"
                      type="text"
                      required
                      placeholder="Full name on card"
                      className={styles.stripeInput}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className={styles.billingColHalf}>
                    <label className={styles.stripeLabelSm} htmlFor="card-country">Country or region</label>
                    <select
                      id="card-country"
                      className={styles.stripeSelect}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="VN">Vietnam</option>
                      <option value="US">United States</option>
                      <option value="SG">Singapore</option>
                      <option value="JP">Japan</option>
                      <option value="DE">Germany</option>
                      <option value="GB">United Kingdom</option>
                      <option value="OTHER">Other country</option>
                    </select>
                  </div>

                  <div className={styles.billingColHalf}>
                    <label className={styles.stripeLabelSm} htmlFor="card-zip">Postal code</label>
                    <input
                      id="card-zip"
                      type="text"
                      placeholder="ZIP / Postal"
                      className={styles.stripeInput}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VietQR View */}
            {paymentMethod === 'qr' && (
              <div className={styles.qrSection}>
                <div className={styles.qrCard}>
                  <div className={styles.qrCodeWrap}>
                    {/* Real VietQR API endpoint preview */}
                    <img
                      src={`https://api.vietqr.io/image/970422-000030999999-qr_only.jpg?amount=${totalPrice * 25000}&addInfo=BASHLAB%20${billingCycle.toUpperCase()}`}
                      alt="VietQR Code"
                      className={styles.qrImg}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BASHLAB-SEABANK-CHECKOUT';
                      }}
                    />
                  </div>
                  <div className={styles.qrInfo}>
                    <div className={styles.qrBankTitle}>SeABank (Ngân hàng TMCP Đông Nam Á)</div>
                    <div className={styles.qrRow}>
                      <span className={styles.qrLabel}>Số TK:</span>
                      <strong className={styles.qrVal}>0000 3099 9999</strong>
                    </div>
                    <div className={styles.qrRow}>
                      <span className={styles.qrLabel}>Chủ TK:</span>
                      <strong className={styles.qrVal}>BASHLAB TECH JSC</strong>
                    </div>
                    <div className={styles.qrRow}>
                      <span className={styles.qrLabel}>Số tiền:</span>
                      <strong className={styles.qrHighlight}>{(totalPrice * 25000).toLocaleString('vi-VN')} VND</strong>
                    </div>
                    <div className={styles.qrRow}>
                      <span className={styles.qrLabel}>Cú pháp:</span>
                      <code className={styles.qrSyntax}>BL {billingCycle.toUpperCase()} {email ? email.split('@')[0] : 'USER'}</code>
                    </div>
                  </div>
                </div>
                <div className={styles.qrStatusLine}>
                  <span className={styles.pulseDot} />
                  <span>Waiting for transfer scan (Auto-activates in ~10s)...</span>
                </div>
              </div>
            )}

            {/* PayPal View */}
            {paymentMethod === 'paypal' && (
              <div className={styles.paypalNotice}>
                <div className={styles.paypalBox}>
                  <p>You will be securely redirected to PayPal to complete your purchase of <strong>${totalPrice}.00 USD</strong>.</p>
                </div>
              </div>
            )}

            {/* Promo Code Toggle */}
            <div className={styles.promoWrap}>
              {!isCouponOpen ? (
                <button
                  type="button"
                  className={styles.promoToggleBtn}
                  onClick={() => setIsCouponOpen(true)}
                >
                  <span>+ Add promotion code</span>
                </button>
              ) : (
                <div className={styles.promoInputRow}>
                  <input
                    type="text"
                    placeholder="e.g. STUDENT"
                    className={styles.promoInput}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.promoApplyBtn}
                    onClick={handleApplyCoupon}
                  >
                    Apply
                  </button>
                </div>
              )}
              {couponApplied && <span className={styles.promoSuccessMsg}>Promotion code applied (-$20)!</span>}
              {couponError && <span className={styles.promoErrorMsg}>{couponError}</span>}
            </div>

            {/* Stripe Link 1-Click Checkbox */}
            <div className={styles.linkCheckboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={saveWithLink}
                  onChange={(e) => setSaveWithLink(e.target.checked)}
                  className={styles.stripeCheckbox}
                />
                <span className={styles.checkboxCustom} />
                <span className={styles.checkboxText}>
                  Save information for secure 1-click checkout with <strong className={styles.linkText}>Link</strong>
                </span>
              </label>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.stripeSubmitBtn}
            >
              {isSubmitting ? (
                <div className={styles.submitSpinner} />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Subscribe • ${totalPrice}.00</span>
                </>
              )}
            </button>

            {/* Terms Disclaimer */}
            <p className={styles.legalDisclaimer}>
              By confirming your subscription, you allow BashLab to charge you for future payments in accordance with their terms. You can always cancel at any time.
            </p>

            {/* Powered by Stripe & Legal Footer */}
            <div className={styles.stripeFooter}>
              <div className={styles.poweredBy}>
                <span>Powered by</span>
                <StripeWordmark />
              </div>
              <div className={styles.stripeLegalLinks}>
                <a href="https://stripe.com/legal/consumer" target="_blank" rel="noreferrer">Terms</a>
                <span>•</span>
                <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {isSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.successCard}>
            <div className={styles.successIconWrap}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className={styles.successTitle}>Subscription Confirmed!</h2>
            <p className={styles.successMsg}>
              Welcome to <strong>BashLab Individual Access</strong>. Your Linux sandbox environment and certifications are ready.
            </p>
            <div className={styles.orderIdBadge}>
              Payment Intent: <code>{orderId}</code>
            </div>
            <Link href="/courses" className={styles.successCtaBtn}>
              Launch Linux Sandboxes Now →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
