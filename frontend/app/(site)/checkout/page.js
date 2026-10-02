'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './checkout.module.css';
import { useAuth } from '@/components/auth/AuthProvider';

const COURSE_DETAILS = {
  'shell-101': {
    title: 'Shell 101 — Bash Basics',
    desc: 'Command line fundamentals, navigation, directory inspection & pipes',
    price: 29,
  },
  'shell-201': {
    title: 'Shell 201 — Pipelines & Streams',
    desc: 'Standard I/O streams, exit codes, process management & filters',
    price: 39,
  },
  'linux-security': {
    title: 'Linux Permissions & Security',
    desc: 'Permissions, sudo privilege boundaries, access controls & security hygiene',
    price: 39,
  },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const courseParam = searchParams.get('course');
  const planParam = searchParams.get('plan') || 'individual';
  const cycleParam = searchParams.get('cycle') || 'annual';

  const selectedCourse = courseParam && COURSE_DETAILS[courseParam] ? COURSE_DETAILS[courseParam] : null;

  // Selected plan and billing cycle
  const [billingCycle, setBillingCycle] = useState(cycleParam === 'monthly' ? 'monthly' : 'annual');
  const [planType, setPlanType] = useState(planParam === 'team' ? 'team' : 'individual');

  useEffect(() => {
    if (cycleParam) {
      setBillingCycle(cycleParam === 'monthly' ? 'monthly' : 'annual');
    }
  }, [cycleParam]);

  useEffect(() => {
    if (planParam) {
      setPlanType(planParam === 'team' ? 'team' : 'individual');
    }
  }, [planParam]);

  // Customer form fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('VN');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Credit Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  // Card brand detection
  const [detectedBrand, setDetectedBrand] = useState(null); // 'visa' | 'mastercard' | 'amex' | null

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Modals
  const [quickSim, setQuickSim] = useState({ open: false, provider: '' });

  // Processing & Success State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Prefill user details if logged in (the session comes from the shared AuthProvider;
  // the browser Supabase client has no auth of its own).
  const { user: authUser, profile: authProfile } = useAuth();
  useEffect(() => {
    if (authUser?.email) setEmail((current) => current || authUser.email);
    if (authProfile?.name) setFullName((current) => current || authProfile.name);
  }, [authUser, authProfile]);

  // Pricing calculations
  const isTeam = planType === 'team';
  const rawSubtotal = selectedCourse
    ? selectedCourse.price
    : (isTeam
        ? (billingCycle === 'annual' ? 288 : 29)
        : (billingCycle === 'annual' ? 108 : 12));
  const discountAmount = couponApplied ? rawSubtotal * couponDiscount : 0;
  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  // Format card number with spaces every 4 digits
  function handleCardNumberChange(e) {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < raw.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += raw[i];
    }
    setCardNumber(formatted);

    // Auto-detect brand
    if (raw.startsWith('4')) setDetectedBrand('visa');
    else if (/^(5[1-5]|2[2-7])/.test(raw)) setDetectedBrand('mastercard');
    else if (/^(34|37)/.test(raw)) setDetectedBrand('amex');
    else setDetectedBrand(null);
  }

  // Format expiry MM / YY
  function handleExpiryChange(e) {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length >= 2) {
      setCardExpiry(raw.slice(0, 2) + ' / ' + raw.slice(2, 4));
    } else {
      setCardExpiry(raw);
    }
  }

  function handleApplyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (code === 'BASHLAB10' || code === 'PRO10' || code === 'HACKER') {
      setCouponApplied(true);
      setCouponDiscount(0.1);
    } else if (code) {
      alert('Invalid or expired promo code.');
    }
  }

  function handleCreditCardSubmit(e) {
    e.preventDefault();
    if (!cardNumber.replace(/\s/g, '')) {
      alert('Please enter a valid credit card number.');
      return;
    }
    processSuccess('Credit Card');
  }

  function processSuccess(paymentMethodTitle) {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setQuickSim({ open: false, provider: '' });
      setOrderId('BL-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      setIsSuccess(true);
    }, 600);
  }

  // Escape key closes modals
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setQuickSim({ open: false, provider: '' });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isSuccess) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.successOverlay}>
          <div className={styles.successIconCircle}>✓</div>
          <h2 className={styles.successTitle}>Payment Successful!</h2>
          <p className={styles.successMsg}>
            Congratulations <strong>{fullName || email || 'Hacker'}</strong>! Your account has been upgraded to{' '}
            <strong>{isTeam ? 'Team & University Access' : 'Individual Access'} ({billingCycle})</strong>. An activation receipt was sent to <strong>{email || 'your email'}</strong>.
          </p>
          <div className={styles.orderIdBadge}>ORDER ID: {orderId}</div>
          <Link href="/courses" className={styles.successCtaBtn}>
            Launch Linux Sandboxes Now →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Background Cityscape với lớp tint đen như trang Landing */}
      <div className={styles.newBgContainer} aria-hidden="true">
        <video
          autoPlay
          loop
          muted
          playsInline
          className={styles.bgMedia}
          src="/background/pixel-cityscape.1920x1080.mp4"
        />
        <div className={styles.bgDimOverlay} />
      </div>


      {/* Main 2-Column Grid */}
      <main className={styles.checkoutContainer}>
        {/* LEFT COLUMN: Payment form with 2 Sectors */}
        <section className={styles.formPanel}>
          <div className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Checkout</h1>
          </div>

          {/* ========================================================
              QUICK CHECKOUT
              ======================================================== */}
          <div className={styles.sectorQuick}>
            <div className={styles.sectorLabel}>Quick checkout</div>

            <div className={styles.quickButtonsGrid}>
              {/* Apple Pay */}
              <button
                type="button"
                className={`${styles.btnQuickPay} ${styles.btnApplePay}`}
                onClick={() => setQuickSim({ open: true, provider: 'Apple Pay' })}
                title="Pay with Apple Pay"
              >
                <img
                  src="/Apple_Pay_logo.svg"
                  alt="Apple Pay"
                  className={styles.applePayLogo}
                />
              </button>

              {/* Google Pay */}
              <button
                type="button"
                className={`${styles.btnQuickPay} ${styles.btnGooglePay}`}
                onClick={() => setQuickSim({ open: true, provider: 'Google Pay' })}
                title="Pay with Google Pay"
              >
                <img
                  src="/Google_Pay_Logo.svg"
                  alt="Google Pay"
                  className={styles.googlePayLogo}
                />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className={styles.orDivider}>
            <span>Or pay with card</span>
          </div>

          {/* ========================================================
              CREDIT CARD
              ======================================================== */}
          <form className={styles.sectorCard} onSubmit={handleCreditCardSubmit}>
            <div className={styles.sectorLabel}>Credit card</div>

            {/* Consolidated Card Input Box */}
            <div className={styles.cardInputsContainer}>
              {/* Card Number */}
              <div className={styles.inputFieldRow}>
                <input
                  type="text"
                  className={styles.cardInput}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                />
                <div className={styles.cardBrandsIcons}>
                  <span className={`${styles.brandPill} ${detectedBrand === 'visa' ? styles.brandPillDetected : ''}`}>
                    <svg width="24" height="8" viewBox="0 0 36 12" fill="#2563eb"><path d="M14.5 11.2L16.7.8h2.7l-2.2 10.4h-2.7zM26.8 1.1c-.6-.2-1.5-.4-2.6-.4-2.8 0-4.8 1.5-4.8 3.6 0 1.6 1.4 2.5 2.5 3 1.1.5 1.5.9 1.5 1.4 0 .8-.9 1.1-1.8 1.1-1.2 0-1.8-.2-2.8-.6l-.4-.2-.4 2.5c.7.3 2 .6 3.3.6 3.1 0 5.1-1.5 5.1-3.8 0-1.3-.8-2.2-2.5-3-1.1-.5-1.7-.9-1.7-1.4 0-.5.6-.9 1.7-.9.9 0 1.6.2 2.2.4l.3.1.4-2.4zm8.7 0h-2.1c-.7 0-1.2.2-1.5.9l-4.2 9.2h2.9l.6-1.6h3.5l.3 1.6h2.5l-2-10.1zm-3.2 6.2l1.4-4 .8 4h-2.2zm-19.6-6.2l-2.6 7.1-.3-1.4c-.5-1.7-2.1-3.6-3.9-4.5l2.5 9.1h2.9l4.3-10.3h-2.9z"/><path d="M4.6 1.1H.1L0 1.7c3.5.9 5.8 3 6.7 5.6L5.8 2c-.2-.6-.6-.9-1.2-.9z" fill="#f59e0b"/></svg>
                  </span>
                  <span className={`${styles.brandPill} ${detectedBrand === 'mastercard' ? styles.brandPillDetected : ''}`}>
                    <svg width="18" height="12" viewBox="0 0 28 18"><circle cx="9" cy="9" r="8" fill="#EB001B"/><circle cx="19" cy="9" r="8" fill="#F79E1B" fillOpacity="0.85"/></svg>
                  </span>
                  <span className={`${styles.brandPill} ${detectedBrand === 'amex' ? styles.brandPillDetected : ''}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700 }}>
                    AMEX
                  </span>
                </div>
              </div>

              {/* Expiry & CVC */}
              <div className={styles.inputSplit}>
                <div className={styles.inputFieldRow}>
                  <input
                    type="text"
                    className={styles.cardInput}
                    placeholder="MM / YY"
                    maxLength={7}
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                  />
                </div>
                <div className={styles.inputFieldRow}>
                  <input
                    type="password"
                    className={styles.cardInput}
                    placeholder="CVC"
                    maxLength={4}
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  />
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#626e82' }}>lock</span>
                </div>
              </div>
            </div>

            {/* Learner Name & Country */}
            <div className={styles.formGroupGrid}>
              <div className={styles.formControl}>
                <label className={styles.controlLabel}>Cardholder name</label>
                <input
                  type="text"
                  className={styles.controlInput}
                  placeholder="First and last name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formControl}>
                <label className={styles.controlLabel}>Country or region</label>
                <select
                  className={styles.controlInput}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="VN">Vietnam</option>
                  <option value="US">United States</option>
                  <option value="SG">Singapore</option>
                  <option value="JP">Japan</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="AU">Australia</option>
                  <option value="CA">Canada</option>
                  <option value="FR">France</option>
                </select>
              </div>
            </div>

            {/* Billing Address & ZIP */}
            <div className={styles.formControl} style={{ marginBottom: 14 }}>
              <label className={styles.controlLabel}>Street address</label>
              <input
                type="text"
                className={styles.controlInput}
                placeholder="123 Cyber Way, Suite 400"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
              />
            </div>

            <div className={styles.formGroupGrid}>
              <div className={styles.formControl}>
                <label className={styles.controlLabel}>City</label>
                <input
                  type="text"
                  className={styles.controlInput}
                  placeholder="City / District"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className={styles.formControl}>
                <label className={styles.controlLabel}>Postal / ZIP code</label>
                <input
                  type="text"
                  className={styles.controlInput}
                  placeholder="e.g. 700000 or 94103"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>
            </div>

            {/* Save Card Checkbox */}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>
                Save card securely for future payments
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              className={styles.btnSubmitPayment}
              disabled={isSubmitting}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>{isSubmitting ? 'Processing...' : `Pay $${finalTotal.toFixed(2)} USD`}</span>
            </button>

            <div className={styles.stripeSecurityFooter}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#68dfa0', flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Secure transactions with</span>
              <img src="/stripe-logo.svg" alt="Stripe" className={styles.stripeLogoImg} />
            </div>
          </form>
        </section>

        {/* RIGHT COLUMN: Order Summary */}
        <aside className={styles.orderSummaryPanel}>
          <div className={styles.summaryTitle}>
            <span>Order Summary</span>
          </div>

          {/* Plan Info Card */}
          <div className={styles.tierCard}>
            <div>
              <div className={styles.tierName}>
                {selectedCourse
                  ? selectedCourse.title
                  : (isTeam
                      ? 'Team & University Access Pass'
                      : 'Individual Access Pass')}
              </div>
              <div className={styles.tierDesc}>
                {selectedCourse
                  ? selectedCourse.desc
                  : (isTeam
                      ? (billingCycle === 'annual'
                          ? 'Billed annually at $288/seat/yr ($24/mo/seat) · Cohort Dashboard & Dedicated Nodes'
                          : 'Billed monthly at $29/seat/mo · Cancel anytime · Cohort Dashboard & Dedicated Nodes')
                      : (billingCycle === 'annual'
                          ? 'Billed annually at $108/yr ($9/mo, Save 25%) · Persistent Sandboxes & Verified Certs'
                          : 'Billed monthly at $12/mo · Cancel anytime · Persistent Sandboxes & Verified Certs'))}
              </div>
            </div>
            <div className={styles.tierPrice}>
              <div className={styles.tierAmount}>
                ${rawSubtotal.toFixed(2)}
              </div>
              <div className={styles.tierPeriod}>
                {selectedCourse
                  ? '/ lifetime access'
                  : (isTeam
                      ? (billingCycle === 'annual' ? '/ seat / year' : '/ seat / month')
                      : (billingCycle === 'annual' ? '/ year' : '/ month'))}
              </div>
            </div>
          </div>

          {/* Coupon Code Input */}
          <div className={styles.couponBox}>
            <input
              type="text"
              className={styles.couponInput}
              placeholder="PROMO CODE: BASHLAB10"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              disabled={couponApplied}
            />
            <button
              type="button"
              className={styles.btnApplyCoupon}
              onClick={handleApplyCoupon}
              disabled={couponApplied}
            >
              {couponApplied ? 'Applied' : 'Apply'}
            </button>
          </div>
          {couponApplied && (
            <div className={styles.couponNotice}>
              ✓ 10% discount applied successfully!
            </div>
          )}

          {/* Price Breakdown */}
          <div className={styles.breakdownList}>
            <div className={styles.breakdownRow}>
              <span>
                {selectedCourse
                  ? `Course (${selectedCourse.title})`
                  : `Subscription (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`}
              </span>
              <span>${rawSubtotal.toFixed(2)}</span>
            </div>
            {couponApplied && (
              <div className={`${styles.breakdownRow} ${styles.breakdownRowDiscount}`}>
                <span>Promo discount (10%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className={styles.breakdownRow}>
              <span>Taxes &amp; Sandbox infrastructure</span>
              <span>$0.00</span>
            </div>
          </div>

          {/* Final Total */}
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total:</span>
            <div className={styles.totalValue}>
              ${finalTotal.toFixed(2)} <span>USD</span>
            </div>
          </div>
        </aside>
      </main>

      {/* ========================================================
          APPLE PAY / GOOGLE PAY SIMULATOR
          ======================================================== */}
      {quickSim.open && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => setQuickSim({ open: false, provider: '' })}
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalHeadTitle}>
                {quickSim.provider} Quick Authorization
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setQuickSim({ open: false, provider: '' })}
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                {quickSim.provider.includes('Apple') ? (
                  <div style={{ background: '#000', padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
                    <img src="/Apple_Pay_logo.svg" alt="Apple Pay" style={{ height: 28, filter: 'brightness(0) invert(1)', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ background: '#fff', padding: '10px 20px', borderRadius: 8, border: '1px solid #dadce0' }}>
                    <img src="/Google_Pay_Logo.svg" alt="Google Pay" style={{ height: 28, display: 'block' }} />
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 6 }}>
                Confirm with {quickSim.provider}
              </h3>
              <p style={{ fontSize: 13.5, color: '#9ba3b8', marginBottom: 24, lineHeight: 1.6 }}>
                {quickSim.provider.includes('Apple')
                  ? 'Double-click side button or authenticate with Touch ID / Face ID to approve payment of '
                  : 'Confirm your Google account and authorize payment of '}
                <strong style={{ color: '#68dfa0' }}>${finalTotal.toFixed(2)} USD</strong> to BashLab.
              </p>

              <button
                type="button"
                className={styles.btnSubmitPayment}
                onClick={() => processSuccess(quickSim.provider)}
              >
                Authorize Payment (Simulate)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090e' }} />}>
      <CheckoutContent />
    </Suspense>
  );
}
