'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './checkout.module.css';
import { supabase } from '@/lib/supabaseClient';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || 'pro';
  const cycleParam = searchParams.get('cycle') || 'annual';

  // Selected plan and billing cycle
  const [billingCycle, setBillingCycle] = useState(cycleParam === 'monthly' ? 'monthly' : 'annual');
  const [planType, setPlanType] = useState(planParam === 'team' ? 'team' : 'pro');

  // Customer form fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('VN');

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
  const [isMomoOpen, setIsMomoOpen] = useState(false);
  const [quickSim, setQuickSim] = useState({ open: false, provider: '' });

  // Processing & Success State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Prefill user details if logged in
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
      } catch {
        // Fallback silently
      }
    }
    loadUser();
  }, []);

  // Pricing calculations
  const baseRate = planType === 'team' ? 29 : 9;
  const rawSubtotal = billingCycle === 'annual' ? (planType === 'team' ? 290 : 89) : baseRate;
  const discountAmount = couponApplied ? rawSubtotal * couponDiscount : 0;
  const finalTotal = Math.max(0, rawSubtotal - discountAmount);
  const vndAmount = (finalTotal * 25400).toLocaleString('vi-VN');

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
      setIsMomoOpen(false);
      setQuickSim({ open: false, provider: '' });
      setOrderId('BL-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      setIsSuccess(true);
    }, 600);
  }

  // Escape key closes modals
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsMomoOpen(false);
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
            <strong>{planType === 'team' ? 'Team Access' : 'Pro Hacker Access'} ({billingCycle})</strong>. An activation receipt was sent to <strong>{email || 'your email'}</strong>.
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
                <svg viewBox="0 0 48 18" width="48" height="18" fill="currentColor">
                  <path d="M7.7 7.7c-.5.6-1.3 1-2.1 1-.1-1 .3-1.9.8-2.5.5-.6 1.4-1 2.2-1.1.1 1-.4 2-.9 2.6zm.9 1.4c-1.2-.1-2.3-.8-2.9-.8-.6 0-1.5.7-2.5.7-1.3 0-2.5-.7-3.2-1.9-1.4-2.4-.4-6 1-7.9.7-1 1.8-1.6 2.9-1.6 1.1 0 2.2.8 2.9.8.6 0 1.9-.8 3.2-.8 1.1 0 2.1.6 2.7 1.4-2.4 1.4-2 4.7.4 5.7-.5 1.5-1.3 3.1-2.5 4.5-.6.7-1.3 1.2-2 1.2zm8.7 5.1h-2.1V2.8h4.4c2.5 0 4.1 1.6 4.1 3.7 0 2.2-1.6 3.7-4.1 3.7h-2.3v4zm0-6.1h2.2c1.4 0 2.2-.8 2.2-1.9 0-1.1-.8-1.9-2.2-1.9h-2.2v3.8zm14.3 6.1l-.3-1.6c-.6 1.1-1.7 1.8-3.1 1.8-2 0-3.3-1.3-3.3-3.2 0-2.1 1.6-3.2 4.4-3.3l2-.1v-.5c0-1-.7-1.6-1.9-1.6-1.1 0-1.8.4-2.1 1.3l-1.8-.5c.6-1.5 1.9-2.2 3.9-2.2 2.3 0 3.8 1.2 3.8 3.2v6.7h-1.6zm-2.9-1.5c1.4 0 2.6-.9 2.6-2.1v-.8l-1.8.1c-1.6.1-2.5.6-2.5 1.7 0 .9.7 1.5 1.7 1.5zm8.9 4.3l3.5-10.4h2.2l-5.1 14.1h-2.1l1.8-4.5-3.3-9.6h2.2l2.3 6.9 1.1-3.5-2.6-3.4z" />
                </svg>
              </button>

              {/* Google Pay */}
              <button
                type="button"
                className={`${styles.btnQuickPay} ${styles.btnGooglePay}`}
                onClick={() => setQuickSim({ open: true, provider: 'Google Pay' })}
                title="Pay with Google Pay"
              >
                <svg viewBox="0 0 48 18" width="48" height="18" fill="none">
                  <path d="M7.8 7.3v2.8h5.3c-.2 1.3-1.5 3.8-5.3 3.8-3.2 0-5.8-2.7-5.8-5.9s2.6-5.9 5.8-5.9c1.8 0 3.1.8 3.8 1.5l2.2-2.1C12.4.2 10.3-.7 7.8-.7 3.5-.7 0 2.8 0 7.1s3.5 7.8 7.8 7.8c4.5 0 7.5-3.2 7.5-7.6 0-.5-.1-.9-.1-1.3H7.8v1.3z" fill="#fff"/>
                  <path d="M22.1 14.5V2.8h-3v11.7h3z" fill="#fff"/>
                  <path d="M28.4 6.8c-2.4 0-4.1 1.8-4.1 4.1 0 2.4 1.7 4.1 4.1 4.1s4.1-1.8 4.1-4.1c0-2.4-1.7-4.1-4.1-4.1zm0 6.6c-1.3 0-2.4-1.1-2.4-2.5s1.1-2.5 2.4-2.5 2.4 1.1 2.4 2.5-1.1 2.5-2.4 2.5z" fill="#fff"/>
                  <path d="M41.4 6.8l-3.8 9.6h-2.1l1.4-3.1-2.5-6.5h2.2l1.4 4.3 1.4-4.3h2z" fill="#fff"/>
                </svg>
              </button>

              {/* MoMo Pay */}
              <button
                type="button"
                className={`${styles.btnQuickPay} ${styles.btnMomoPay}`}
                onClick={() => setIsMomoOpen(true)}
                title="Pay with MoMo Wallet"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                </svg>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, marginLeft: 6 }}>
                  MoMo
                </span>
              </button>
            </div>

            <div className={styles.quickSubtext}>
              1-click instant biometric or QR code authorization
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
                </select>
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
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
              <span>{isSubmitting ? 'Processing...' : `Pay $${finalTotal.toFixed(2)} USD`}</span>
            </button>

            <div className={styles.securityGuarantee}>
              <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
              256-bit SSL encryption · PCI-DSS Level 1 compliant
            </div>
          </form>
        </section>

        {/* RIGHT COLUMN: Order Summary */}
        <aside className={styles.orderSummaryPanel}>
          <div className={styles.summaryTitle}>
            <span>Order Summary</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#68dfa0', fontWeight: 600 }}>
              ACTIVE PLAN
            </span>
          </div>

          {/* Plan Info Card */}
          <div className={styles.tierCard}>
            <div>
              <span className={styles.tierBadge}>
                {planType === 'team' ? 'TEAM ACCESS' : 'PRO HACKER'}
              </span>
              <div className={styles.tierName}>
                {planType === 'team' ? 'Linux Team & University' : 'Pro Linux Access'}
              </div>
              <div className={styles.tierDesc}>
                {billingCycle === 'annual' ? 'Billed annually (Save 20%)' : 'Billed monthly'}
              </div>
            </div>
            <div className={styles.tierPrice}>
              <div className={styles.tierAmount}>
                ${rawSubtotal.toFixed(2)}
              </div>
              <div className={styles.tierPeriod}>
                {billingCycle === 'annual' ? '/ year' : '/ month'}
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
              <span>Subscription ({billingCycle === 'annual' ? 'Annual' : 'Monthly'})</span>
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

          {/* Perks list */}
          <ul className={styles.featuresMiniList}>
            <li><span className={styles.checkIcon}>✓</span> Unlimited Linux container sandboxes</li>
            <li><span className={styles.checkIcon}>✓</span> Real-time automated task verification</li>
            <li><span className={styles.checkIcon}>✓</span> Full access to Shell 101, 201 &amp; Linux Security</li>
            <li><span className={styles.checkIcon}>✓</span> Verified digital certificate of completion</li>
          </ul>
        </aside>
      </main>

      {/* ========================================================
          MODAL 1: MOMO PAY SCANNER POPUP
          ======================================================== */}
      {isMomoOpen && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsMomoOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalHeadTitle}>
                <span style={{ color: '#ff60be', fontSize: 18 }}>●</span>
                Pay with MoMo Wallet
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsMomoOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              <span className={styles.momoBadge}>QUICK QR SCANNER</span>

              <div className={styles.qrContainer}>
                <svg viewBox="0 0 100 100" fill="#a50064">
                  <rect x="5" y="5" width="26" height="26" rx="4" fill="#a50064"/>
                  <rect x="9" y="9" width="18" height="18" rx="2" fill="#fff"/>
                  <rect x="13" y="13" width="10" height="10" rx="1" fill="#a50064"/>

                  <rect x="69" y="5" width="26" height="26" rx="4" fill="#a50064"/>
                  <rect x="73" y="9" width="18" height="18" rx="2" fill="#fff"/>
                  <rect x="77" y="13" width="10" height="10" rx="1" fill="#a50064"/>

                  <rect x="5" y="69" width="26" height="26" rx="4" fill="#a50064"/>
                  <rect x="9" y="73" width="18" height="18" rx="2" fill="#fff"/>
                  <rect x="13" y="77" width="10" height="10" rx="1" fill="#a50064"/>

                  <rect x="36" y="8" width="6" height="6" fill="#a50064"/>
                  <rect x="46" y="8" width="8" height="6" fill="#a50064"/>
                  <rect x="58" y="8" width="6" height="6" fill="#a50064"/>

                  <rect x="36" y="18" width="8" height="8" fill="#a50064"/>
                  <rect x="48" y="20" width="6" height="12" fill="#a50064"/>
                  <rect x="58" y="18" width="7" height="6" fill="#a50064"/>

                  <rect x="10" y="38" width="14" height="6" fill="#a50064"/>
                  <rect x="28" y="38" width="16" height="14" fill="#a50064"/>
                  <rect x="48" y="38" width="14" height="8" fill="#a50064"/>
                  <rect x="68" y="38" width="18" height="6" fill="#a50064"/>

                  <rect x="40" y="40" width="20" height="20" rx="4" fill="#a50064"/>
                  <circle cx="50" cy="50" r="5" fill="#fff"/>
                </svg>
              </div>

              <div className={styles.qrInstructions}>
                Open the <strong>MoMo</strong> app on your phone and select <strong>&ldquo;Scan QR Code&rdquo;</strong> to complete payment of <strong>{vndAmount} VND</strong>.
              </div>

              <button
                type="button"
                className={styles.btnMomoDeeplink}
                onClick={() => processSuccess('MoMo Wallet')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>phone_android</span>
                Open MoMo App (Simulate payment)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: APPLE PAY / GOOGLE PAY SIMULATOR
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
              <div style={{ fontSize: 42, marginBottom: 12 }}>
                {quickSim.provider.includes('Apple') ? '🍎' : '🌐'}
              </div>
              <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 6 }}>
                Confirm with {quickSim.provider}
              </h3>
              <p style={{ fontSize: 13.5, color: '#9ba3b8', marginBottom: 24, lineHeight: 1.6 }}>
                Double-click side button or authenticate with Touch ID / Face ID to approve payment of{' '}
                <strong style={{ color: '#68dfa0' }}>${finalTotal.toFixed(2)} USD</strong> to BashLab.
              </p>

              <button
                type="button"
                className={styles.btnSubmitPayment}
                onClick={() => processSuccess(quickSim.provider)}
              >
                Authorize with Touch ID / Face ID (Simulate payment)
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
