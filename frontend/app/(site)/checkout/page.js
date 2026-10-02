'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './checkout.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected plan and billing cycle
  const [billingCycle, setBillingCycle] = useState('annual'); // 'annual' | 'monthly'
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'qr' | 'paypal'

  // Customer form fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('Vietnam');

  // Card form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Processing & Success State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Check logged-in user to prefill
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
        // Ignore fallback
      }
    }
    loadUser();
  }, []);

  // Pricing calculations
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
      setCouponError('Invalid promo code. Try "STUDENT"');
    }
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) {
      alert('Please provide your full name and email address.');
      return;
    }

    setIsSubmitting(true);
    // Simulate payment gateway roundtrip
    setTimeout(() => {
      const generatedId = `BL-${Math.floor(100000 + Math.random() * 900000)}-PRO`;
      setOrderId(generatedId);
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1400);
  };

  return (
    <div className={styles.container}>
      {/* Top Bar with back link & SSL security badge */}
      <div className={styles.topBar}>
        <Link href="/subscription" className={styles.backBtn}>
          <span>←</span>
          <span>Return to Plans</span>
        </Link>
        <div className={styles.secureBadge}>
          <svg className={styles.secureIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>256-Bit SSL Encrypted Checkout</span>
        </div>
      </div>

      <div className={styles.headerSection}>
        <h1 className={styles.heading}>
          Upgrade to <span className={styles.headingAccent}>Pro Access</span>
        </h1>
        <p className={styles.subheading}>
          Unlock persistent Linux sandboxes, upcoming advanced security tracks, automated testing, and official certificates.
        </p>
      </div>

      <div className={styles.checkoutLayout}>
        {/* Left Column: Form & Payment Method */}
        <form onSubmit={handleSubmitOrder} className={styles.formColumn}>
          {/* Step 1: Customer Information */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <span className={styles.stepNum}>1</span>
              <h2 className={styles.sectionTitle}>Account &amp; Billing Details</h2>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="alex@example.com"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className={styles.inputHint}>Your license key &amp; sandbox credentials will be linked here</span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="fullName">Full Name *</label>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  className={styles.input}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <span className={styles.inputHint}>Used on your Certificate of Mastery</span>
              </div>

              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label className={styles.label} htmlFor="country">Country / Region</label>
                <select
                  id="country"
                  className={styles.select}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="Vietnam">Vietnam (VN)</option>
                  <option value="United States">United States (US)</option>
                  <option value="Singapore">Singapore (SG)</option>
                  <option value="Japan">Japan (JP)</option>
                  <option value="Germany">Germany (DE)</option>
                  <option value="United Kingdom">United Kingdom (UK)</option>
                  <option value="Australia">Australia (AU)</option>
                  <option value="Other">Other / Global</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <span className={styles.stepNum}>2</span>
              <h2 className={styles.sectionTitle}>Select Payment Method</h2>
            </div>

            <div className={styles.paymentTabs} role="tablist" aria-label="Payment Methods">
              <button
                type="button"
                role="tab"
                aria-selected={paymentMethod === 'card'}
                className={`${styles.payTab} ${paymentMethod === 'card' ? styles.payTabActive : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <svg className={styles.payTabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <span>Credit Card</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={paymentMethod === 'qr'}
                className={`${styles.payTab} ${paymentMethod === 'qr' ? styles.payTabActive : ''}`}
                onClick={() => setPaymentMethod('qr')}
              >
                <svg className={styles.payTabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>QR / MoMo / VNPay</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={paymentMethod === 'paypal'}
                className={`${styles.payTab} ${paymentMethod === 'paypal' ? styles.payTabActive : ''}`}
                onClick={() => setPaymentMethod('paypal')}
              >
                <svg className={styles.payTabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 13l2.5-10h6.5a4 4 0 0 1 0 8h-4.5l-1 5" />
                  <path d="M7 21l2.5-10h5.5a4 4 0 0 1 0 8h-4.5l-1 5" />
                </svg>
                <span>PayPal</span>
              </button>
            </div>

            {/* Credit Card Inputs */}
            {paymentMethod === 'card' && (
              <div className={styles.formGrid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label} htmlFor="cardNum">Card Number</label>
                  <input
                    id="cardNum"
                    type="text"
                    required
                    placeholder="4242 •••• •••• 4242"
                    className={styles.input}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="cardExpiry">Expiration Date</label>
                  <input
                    id="cardExpiry"
                    type="text"
                    required
                    placeholder="MM / YY"
                    className={styles.input}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="cardCvc">CVC / CVV</label>
                  <input
                    id="cardCvc"
                    type="password"
                    maxLength={4}
                    required
                    placeholder="123"
                    className={styles.input}
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                  />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label} htmlFor="cardName">Cardholder Name</label>
                  <input
                    id="cardName"
                    type="text"
                    required
                    placeholder="Name as printed on card"
                    className={styles.input}
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* QR Pay / Bank Transfer Option */}
            {paymentMethod === 'qr' && (
              <div className={styles.qrBox}>
                <div className={styles.qrImageWrap}>
                  <svg className={styles.qrImage} viewBox="0 0 100 100" fill="#061014" aria-label="Sample Payment QR Code">
                    {/* Stylized QR Code Pattern */}
                    <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
                    <rect x="8" y="8" width="28" height="28" fill="#061014" />
                    <rect x="12" y="12" width="20" height="20" fill="#ffffff" />
                    <rect x="16" y="16" width="12" height="12" fill="#061014" />
                    
                    <rect x="64" y="8" width="28" height="28" fill="#061014" />
                    <rect x="68" y="12" width="20" height="20" fill="#ffffff" />
                    <rect x="72" y="16" width="12" height="12" fill="#061014" />

                    <rect x="8" y="64" width="28" height="28" fill="#061014" />
                    <rect x="12" y="68" width="20" height="20" fill="#ffffff" />
                    <rect x="16" y="72" width="12" height="12" fill="#061014" />

                    <rect x="42" y="14" width="6" height="14" fill="#061014" />
                    <rect x="52" y="8" width="6" height="8" fill="#061014" />
                    <rect x="42" y="34" width="16" height="6" fill="#061014" />
                    <rect x="14" y="44" width="8" height="12" fill="#061014" />
                    <rect x="28" y="42" width="6" height="16" fill="#061014" />
                    <rect x="42" y="46" width="14" height="14" fill="#061014" />
                    <rect x="62" y="42" width="10" height="8" fill="#061014" />
                    <rect x="78" y="44" width="14" height="12" fill="#061014" />
                    <rect x="42" y="66" width="8" height="18" fill="#061014" />
                    <rect x="56" y="64" width="18" height="6" fill="#061014" />
                    <rect x="62" y="76" width="24" height="10" fill="#061014" />
                  </svg>
                </div>
                <div className={styles.qrNotice}>
                  Scan with your banking app, <strong>MoMo</strong>, or <strong>VNPay</strong>.<br />
                  Transfer syntax: <span className={styles.qrCodeSyntax}>BASHLAB-PRO89</span>
                </div>
              </div>
            )}

            {/* PayPal */}
            {paymentMethod === 'paypal' && (
              <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  You will be safely redirected to PayPal to complete your purchase with one click.
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffc439',
                  color: '#003087',
                  fontWeight: 800,
                  padding: '12px 28px',
                  borderRadius: '24px',
                  fontSize: '1rem',
                  fontStyle: 'italic',
                  userSelect: 'none'
                }}>
                  PayPal Checkout
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.paySubmitBtn}
          >
            {isSubmitting ? (
              <span>Securing payment &amp; activating sandboxes...</span>
            ) : (
              <span>Confirm &amp; Pay ${totalPrice}.00 USD</span>
            )}
          </button>

          <p className={styles.termsText}>
            By completing this transaction, you agree to the BashLab Terms of Service and Privacy Policy. All accounts include a 30-day money-back guarantee.
          </p>
        </form>

        {/* Right Column: Order Summary */}
        <div className={styles.summaryColumn}>
          <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Order Summary</h2>

            {/* Billing cycle switch */}
            <div className={styles.cycleSwitch} role="group" aria-label="Billing cycle">
              <button
                type="button"
                className={`${styles.cycleBtn} ${billingCycle === 'annual' ? styles.cycleBtnActive : ''}`}
                onClick={() => setBillingCycle('annual')}
              >
                <span>Annual Billing</span>
                <span className={styles.cycleSaveTag}>SAVE 18%</span>
              </button>

              <button
                type="button"
                className={`${styles.cycleBtn} ${billingCycle === 'monthly' ? styles.cycleBtnActive : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                <span>Monthly Billing</span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)' }}>Cancel anytime</span>
              </button>
            </div>

            {/* Perks breakdown */}
            <ul className={styles.planPerksList}>
              <li className={styles.perkItem}>
                <span className={styles.perkCheck}>✓</span>
                <span>All current &amp; upcoming tracks (Shell 101, 201, Linux Sec)</span>
              </li>
              <li className={styles.perkItem}>
                <span className={styles.perkCheck}>✓</span>
                <span>Unlimited persistent container sessions</span>
              </li>
              <li className={styles.perkItem}>
                <span className={styles.perkCheck}>✓</span>
                <span>Automated real-time test verifications</span>
              </li>
              <li className={styles.perkItem}>
                <span className={styles.perkCheck}>✓</span>
                <span>Verified digital Certificate of Mastery</span>
              </li>
              <li className={styles.perkItem}>
                <span className={styles.perkCheck}>✓</span>
                <span>Priority runner queue (Zero wait time)</span>
              </li>
            </ul>

            {/* Promo Code Input */}
            <form onSubmit={handleApplyCoupon} className={styles.couponArea}>
              <input
                type="text"
                placeholder="Promo code (e.g. STUDENT)"
                className={styles.input}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={couponApplied}
              />
              <button
                type="submit"
                disabled={couponApplied || !couponCode.trim()}
                className={styles.couponBtn}
              >
                {couponApplied ? 'Applied ✓' : 'Apply'}
              </button>
            </form>
            {couponError && (
              <div style={{ color: '#ef4444', fontSize: '0.74rem', marginTop: '-14px', marginBottom: '14px' }}>
                {couponError}
              </div>
            )}

            {/* Breakdown costs */}
            <div className={styles.priceBreakdown}>
              <div className={styles.priceRow}>
                <span>Pro Hacker Plan ({billingCycle === 'annual' ? '1 Year' : '1 Month'})</span>
                <span>${basePrice}.00</span>
              </div>

              {couponApplied && (
                <div className={styles.priceRow} style={{ color: '#68dfa0' }}>
                  <span>Discount (Coupon Applied)</span>
                  <span>-${discountAmount}.00</span>
                </div>
              )}

              <div className={styles.priceRow}>
                <span>Estimated Tax / VAT</span>
                <span>$0.00</span>
              </div>

              <div className={styles.priceRowTotal}>
                <span className={styles.totalLabel}>Total Due Today</span>
                <span className={styles.totalValue}>${totalPrice}.00</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              <span>🔒 30-day money-back guarantee</span>
              <span>·</span>
              <span>Instant activation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {isSuccess && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.successCard}>
            <div className={styles.successIconWrap}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className={styles.successTitle}>Payment Successful!</h2>
            <p className={styles.successMsg}>
              Congratulations <strong>{fullName || 'Hacker'}</strong>! Your account has been upgraded to <strong>Pro Access ({billingCycle})</strong>. An activation receipt was sent to <strong>{email}</strong>.
            </p>

            <div className={styles.orderIdBadge}>
              ORDER CONFIRMATION: {orderId}
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
