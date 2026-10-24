
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, CalendarDays, Clock, Baby, ShieldCheck, Moon,
  AlertCircle, CreditCard, Banknote, QrCode, Receipt,
  CheckCircle2, ArrowLeft, Download, LoaderCircle,
  ShieldCheck as SecureIcon, FileText
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { jsPDF } from 'jspdf';

const BookingModal = ({
  provider,
  isOpen,
  onClose,
  onBookingCreated
}) => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [step, setStep] = useState('form');
  const [booking, setBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [upiSecondsLeft, setUpiSecondsLeft] = useState(300);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [dateString, setDateString] = useState(
    tomorrow.toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [isOvernight, setIsOvernight] = useState(false);

  const [selectedChildIndices, setSelectedChildIndices] = useState([0]);
  const [customChildName, setCustomChildName] = useState('');
  const [customChildAge, setCustomChildAge] = useState('3');
  const [customChildAllergies, setCustomChildAllergies] = useState('');

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    if (user?.name) setEmergencyName(user.name);
    if (user?.phone) setEmergencyPhone(user.phone);
  }, [user]);

  const providerUser = provider?.user || {};
  const providerName = providerUser.name || provider?.name || 'Childcare Provider';
  const providerId = providerUser._id || provider?._id;

  const hourlyRate = Number(provider?.hourlyRate) || 25;
  const overnightRate = Number(provider?.overnightRate) || 30;
  const maxCapacity = Number(provider?.maxCapacity) || 3;

  const timeToMinutes = (time) => {
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  if (isOvernight && endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  const totalHours = Math.round(
    (Math.max(0, endMinutes - startMinutes) / 60) * 10
  ) / 10;

  const children = useMemo(() => {
    if (user?.children?.length) {
      return selectedChildIndices
        .map((index) => user.children[index])
        .filter(Boolean)
        .map((child) => ({
          name: child.name,
          age: Number(child.age),
          allergies: child.allergies || [],
          specialNeeds: child.specialNeeds || ''
        }));
    }

    if (!customChildName.trim()) return [];

    return [{
      name: customChildName.trim(),
      age: Number(customChildAge) || 3,
      allergies: customChildAllergies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      specialNeeds: ''
    }];
  }, [
    user,
    selectedChildIndices,
    customChildName,
    customChildAge,
    customChildAllergies
  ]);

  const childCount = children.length;
  const currentRate = isOvernight ? overnightRate : hourlyRate;
  const subtotal = Math.round(currentRate * totalHours * childCount);
  const platformFee = 5;
  const totalAmount = subtotal + platformFee;

  const displayAmount = Number(
    booking?.totalAmount ?? totalAmount
  );

  const bookingId = booking?._id || booking?.id || '';
  const formattedDate = dateString
    ? new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—';

  const getPaymentStatus = () => {
    if (paymentMethod === 'cash_after_service') {
      return 'DUE - Pay after service completion';
    }

    if (paymentMethod === 'demo_upi') {
      return booking?.paymentStatus === 'paid'
        ? 'DEMO PAYMENT COMPLETED'
        : 'DEMO PAYMENT PENDING';
    }

    return 'NOT SELECTED';
  };

  const getBookingStatus = () => {
    if (booking?.status === 'pending_payment') {
      return 'Awaiting payment method';
    }

    if (booking?.status === 'confirmed') return 'Confirmed';
    if (booking?.status === 'in-progress') return 'Service in progress';
    if (booking?.status === 'completed') return 'Completed';
    if (booking?.status === 'cancelled') return 'Cancelled';

    return 'Booking request submitted';
  };

  const handleClose = () => {
    setStep('form');
    setBooking(null);
    setPaymentMethod('');
    setErrorMessage('');
    setLoading(false);
    setUpiSecondsLeft(300);
    onClose?.();
  };

  const handleReceiptDone = () => {
    if (onBookingCreated && booking) onBookingCreated(booking);
    handleClose();
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!user) {
      addToast('Please log in to book childcare.', 'warning');
      navigate('/login');
      return;
    }

    if (user.role !== 'parent') {
      setErrorMessage('Only parent accounts can create bookings.');
      return;
    }

    if (!providerId) {
      setErrorMessage('Provider details are missing. Please select a provider again.');
      return;
    }

    if (!children.length) {
      setErrorMessage('Please select or enter at least one child.');
      return;
    }

    if (children.length > maxCapacity) {
      setErrorMessage(`This provider can accept a maximum of ${maxCapacity} children.`);
      return;
    }

    if (!dateString || !startTime || !endTime) {
      setErrorMessage('Please select a date and both times.');
      return;
    }

    const selectedDate = new Date(`${dateString}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setErrorMessage('Please select today or a future date.');
      return;
    }

    if (!isOvernight && endMinutes <= startMinutes) {
      setErrorMessage('End time must be later than start time. Enable overnight care if needed.');
      return;
    }

    if (totalHours <= 0) {
      setErrorMessage('Please select a valid booking duration.');
      return;
    }

    if (!emergencyName.trim() || !emergencyPhone.trim()) {
      setErrorMessage('Emergency contact name and phone are required.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/bookings', {
        providerId,
        dateString,
        startTime,
        endTime,
        isOvernight,
        childDetails: children,
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relation: 'Parent / Guardian'
        },
        specialInstructions: specialInstructions.trim()
      });

      const createdBooking = response.data?.data;

      if (!response.data?.success || !createdBooking?._id) {
        throw new Error(
          response.data?.message || 'The booking could not be created.'
        );
      }

      setBooking(createdBooking);
      setStep('payment');

      addToast('Booking details saved. Please choose a payment method.', 'success');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Unable to create the booking. Please try again.';

      setErrorMessage(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const choosePaymentMethod = async (method) => {
    if (!bookingId) {
      setErrorMessage('Booking ID is missing. Please try again.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await api.post(
        `/bookings/${bookingId}/payment-method`,
        { paymentMethod: method }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || 'Unable to save the payment method.'
        );
      }

      setPaymentMethod(method);

      if (response.data?.data) {
        setBooking(response.data.data);
      }

      if (method === 'cash_after_service') {
        setStep('receipt');
        addToast('Cash payment selected. Receipt is ready to download.', 'success');

      } else {
        setUpiSecondsLeft(300);
        setStep('upi');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Could not select the payment method.';

      setErrorMessage(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const completeDemoPayment = async () => {
    if (!bookingId) return;

    if (upiSecondsLeft <= 0) {
      setErrorMessage('The 5-minute QR session has expired. Generate a new QR to continue.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await api.post(
        `/bookings/${bookingId}/demo-payment`
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || 'Demo payment could not be completed.'
        );
      }

      if (response.data?.data) {
        setBooking(response.data.data);
      } else {
        setBooking((previous) => ({
          ...previous,
          paymentStatus: 'paid'
        }));
      }

      setStep('receipt');
      addToast('Demo payment completed. No real money was transferred.', 'success');

    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Demo payment failed. Please try again.';

      setErrorMessage(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceiptPDF = async () => {
    if (!bookingId) {
      addToast('Booking reference is missing. Receipt cannot be generated.', 'error');
      return;
    }

    setDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 18;
      const rightEdge = pageWidth - margin;
      let y = 20;

      const addLine = (label, value) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, margin, y);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);

        const valueText = String(value ?? '—');
        const maxWidth = 100;
        const wrapped = pdf.splitTextToSize(valueText, maxWidth);

        pdf.text(wrapped, rightEdge, y, { align: 'right' });
        y += Math.max(8, wrapped.length * 5);
      };

      // Header
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, 30, 4, 4, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Little Steps', margin + 7, y + 12);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('CHILDCARE BOOKING RECEIPT', margin + 7, y + 21);

      y += 40;

      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Booking Reference', margin, y);

      y += 9;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, rightEdge, y);
      y += 10;

      addLine('Booking ID', bookingId);
      addLine('Booking status', getBookingStatus());
      addLine('Booking date', formattedDate);
      addLine('Service time', `${startTime} - ${endTime}${isOvernight ? ' (Overnight)' : ''}`);
      addLine('Parent / Guardian', user?.name || emergencyName || 'Parent');
      addLine('Provider', providerName);
      addLine('Number of children', childCount);
      addLine('Emergency contact', emergencyName);
      addLine('Emergency phone', emergencyPhone);

      y += 2;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, rightEdge, y);
      y += 10;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Payment Summary', margin, y);
      y += 10;

      addLine('Care charge', `$${Number(booking?.subtotal ?? subtotal).toFixed(2)}`);
      addLine('Platform fee', `$${Number(booking?.platformFee ?? platformFee).toFixed(2)}`);

      pdf.setFillColor(238, 242, 255);
      pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 13, 2, 2, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(67, 56, 202);
      pdf.text('TOTAL AMOUNT', margin + 4, y + 6);
      pdf.text(`$${displayAmount.toFixed(2)}`, rightEdge - 4, y + 6, {
        align: 'right'
      });

      y += 22;
      addLine(
        'Payment method',
        paymentMethod === 'cash_after_service'
          ? 'Cash After Service'
          : 'UPI Demo'
      );

      addLine('Payment status', getPaymentStatus());

      y += 4;

      if (paymentMethod === 'cash_after_service') {
        pdf.setFillColor(255, 247, 237);
        pdf.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');
        pdf.setTextColor(154, 52, 18);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('PAYMENT DUE AFTER SERVICE COMPLETION', margin + 5, y + 8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text('This receipt is not proof of cash payment.', margin + 5, y + 14);
        y += 28;
      } else {
        pdf.setFillColor(255, 247, 237);
        pdf.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');
        pdf.setTextColor(154, 52, 18);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('DEMO PAYMENT - NO REAL MONEY TRANSFERRED', margin + 5, y + 8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text('This receipt records a simulated payment only.', margin + 5, y + 14);
        y += 28;
      }

      if (specialInstructions.trim()) {
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('Care instructions', margin, y);
        y += 6;

        pdf.setFont('helvetica', 'normal');
        const notes = pdf.splitTextToSize(
          specialInstructions.trim(),
          pageWidth - margin * 2
        );
        pdf.text(notes, margin, y);
        y += notes.length * 5 + 5;
      }

      const footerY = Math.min(y + 5, 275);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, footerY, rightEdge, footerY);

      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(
        'Keep this receipt for your records. Provider confirmation may still be required.',
        margin,
        footerY + 7
      );
      pdf.text(
        `Generated: ${new Date().toLocaleString('en-IN')}`,
        margin,
        footerY + 13
      );

      const safeId = String(bookingId).replace(/[^a-zA-Z0-9_-]/g, '');
      pdf.save(`Little-Steps-Receipt-${safeId || 'booking'}.pdf`);

      addToast('Your receipt PDF has been generated. Check your Downloads folder.', 'success');
    } catch (error) {
      console.error('Receipt PDF generation failed:', error);
      addToast(`Unable to generate the PDF: ${error?.message || 'Please try again.'}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (step !== 'upi') return undefined;

    const timerId = window.setInterval(() => {
      setUpiSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [step, bookingId]);

  const formattedUpiTimer = `${String(Math.floor(upiSecondsLeft / 60)).padStart(2, '0')}:${String(upiSecondsLeft % 60).padStart(2, '0')}`;

  const qrData = `LITTLE-STEPS-DEMO|BOOKING:${bookingId}|AMOUNT:${displayAmount}|NO-REAL-PAYMENT`;
  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrData)}`;

  if (!isOpen || !provider) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
      <section className="my-4 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="relative bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-6 py-6 text-white sm:px-8">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close booking"
            className="absolute right-5 top-5 rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 pr-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-bold">
              {providerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold sm:text-2xl">
                  {step === 'form' && 'Book Childcare'}
                  {step === 'payment' && 'Choose Payment'}
                  {step === 'upi' && 'UPI Demo QR'}
                  {step === 'receipt' && 'Booking Receipt'}
                </h2>
                {provider?.verificationStatus === 'verified' && (
                  <ShieldCheck className="text-emerald-200" size={19} />
                )}
              </div>
              <p className="mt-1 text-sm text-indigo-100">
                Little Steps · {providerName}
              </p>
              <p className="mt-1 text-xs text-indigo-100/80">
                Secure booking flow · Demo payment environment
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            {['form', 'payment', 'receipt'].map((item, index) => {
              const active =
                step === item ||
                (step === 'upi' && item === 'payment') ||
                (step === 'receipt' && index < 3);

              return (
                <div key={item} className="flex-1">
                  <div className={`h-1.5 rounded-full ${active ? 'bg-white' : 'bg-white/25'}`} />
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-white/80">
                    {['Booking', 'Payment', 'Receipt'][index]}
                  </p>
                </div>
              );
            })}
          </div>
        </header>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5 sm:p-8">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Something needs your attention</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-bold text-slate-800">
                  Children
                </label>

                {user?.children?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {user.children.map((child, index) => {
                      const selected = selectedChildIndices.includes(index);

                      return (
                        <button
                          type="button"
                          key={child._id || index}
                          onClick={() => setSelectedChildIndices((previous) => {
                            if (previous.includes(index)) {
                              return previous.length > 1
                                ? previous.filter((value) => value !== index)
                                : previous;
                            }
                            return [...previous, index];
                          })}
                          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                            selected
                              ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                              : 'border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                            <Baby size={20} />
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-800">{child.name}</span>
                            <span className="text-xs text-slate-500">{child.age} years old</span>
                          </span>
                          {selected && <CheckCircle2 size={18} className="ml-auto text-indigo-600" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                    <input
                      required
                      value={customChildName}
                      onChange={(event) => setCustomChildName(event.target.value)}
                      placeholder="Child's full name"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    <input
                      required
                      type="number"
                      min="0"
                      max="18"
                      value={customChildAge}
                      onChange={(event) => setCustomChildAge(event.target.value)}
                      aria-label="Child age"
                      placeholder="Age"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    <input
                      value={customChildAllergies}
                      onChange={(event) => setCustomChildAllergies(event.target.value)}
                      placeholder="Allergies, if any"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:col-span-2"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  <span className="mb-2 flex items-center gap-2">
                    <CalendarDays size={16} className="text-indigo-600" />
                    Booking date
                  </span>
                  <input
                    required
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={dateString}
                    onChange={(event) => setDateString(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <label className="flex items-center gap-3 self-end rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold text-indigo-900">
                  <input
                    type="checkbox"
                    checked={isOvernight}
                    onChange={(event) => setIsOvernight(event.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <Moon size={17} />
                  Overnight childcare
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  <span className="mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-600" />
                    Start time
                  </span>
                  <input
                    required
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  <span className="mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-600" />
                    End time
                  </span>
                  <input
                    required
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-800">Emergency contact</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={emergencyName}
                    onChange={(event) => setEmergencyName(event.target.value)}
                    placeholder="Contact person's name"
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                  <input
                    required
                    value={emergencyPhone}
                    onChange={(event) => setEmergencyPhone(event.target.value)}
                    placeholder="Contact phone number"
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Care instructions <span className="font-normal text-slate-400">(optional)</span>
                <textarea
                  rows={3}
                  value={specialInstructions}
                  onChange={(event) => setSpecialInstructions(event.target.value)}
                  placeholder="Allergies, bedtime routine, food preferences, or other instructions..."
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-4 font-bold text-slate-800">Price breakdown</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 text-slate-600">
                    <span>Care ({totalHours} hours × {childCount} child{childCount === 1 ? '' : 'ren'})</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform fee</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-extrabold text-slate-900">
                    <span>Total</span>
                    <span className="text-indigo-700">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <LoaderCircle size={19} className="animate-spin" /> : <CreditCard size={19} />}
                {loading ? 'Creating booking...' : 'Continue to payment'}
              </button>
            </form>
          )}

          {step === 'payment' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-indigo-50 p-5">
                <p className="text-sm text-indigo-700">Booking total</p>
                <p className="mt-1 text-3xl font-extrabold text-indigo-900">
                  ${displayAmount.toFixed(2)}
                </p>
                <p className="mt-2 break-all text-xs text-slate-500">
                  Reference: {bookingId}
                </p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => choosePaymentMethod('cash_after_service')}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Banknote size={25} />
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-slate-900">Cash After Service</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Pay after the childcare service is completed.
                  </span>
                </span>
                <span className="text-xs font-bold text-emerald-700">CASH</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => choosePaymentMethod('demo_upi')}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 p-5 text-left transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <QrCode size={25} />
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-slate-900">UPI QR Code</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Open a demo QR and simulate payment.
                  </span>
                </span>
                <span className="text-xs font-bold text-indigo-700">UPI DEMO</span>
              </button>

              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <strong>Demo notice:</strong> UPI in this prototype does not transfer real money.
              </p>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"
              >
                <ArrowLeft size={16} /> Back to booking form
              </button>
            </div>
          )}

          {step === 'upi' && (
            <div className="space-y-5 text-center">
              <div>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <QrCode size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">UPI QR Session</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Booking amount: ${displayAmount.toFixed(2)}
                </p>
                <div className={`mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${upiSecondsLeft > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
                  <Clock size={16} />
                  {upiSecondsLeft > 0 ? `QR expires in ${formattedUpiTimer}` : 'QR session expired'}
                </div>
              </div>

              <div className={`mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${upiSecondsLeft <= 0 ? 'opacity-40 grayscale' : ''}`}>
                <img
                  src={qrUrl}
                  alt="Demo QR code - not a real payment QR"
                  width="240"
                  height="240"
                  className="h-60 w-60"
                />
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <p className="font-extrabold">DEMO — NO REAL PAYMENT</p>
                <p className="mt-1 text-sm">
                  This QR contains booking reference data only. It is not a valid payment QR.
                </p>
              </div>

              {upiSecondsLeft > 0 ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={completeDemoPayment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {loading && <LoaderCircle size={18} className="animate-spin" />}
                  {loading ? 'Processing demo...' : 'Complete demo payment'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUpiSecondsLeft(300);
                    setErrorMessage('');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-4 font-bold text-white transition hover:bg-rose-700"
                >
                  <QrCode size={18} /> Generate New QR (5:00)
                </button>
              )}

              <button
                type="button"
                onClick={() => setStep('payment')}
                className="text-sm font-semibold text-slate-500 hover:text-indigo-700"
              >
                Choose another payment method
              </button>
            </div>
          )}

          {step === 'receipt' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="mt-4 text-2xl font-extrabold text-slate-900">
                  Booking Successful!
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your booking has been saved successfully. Your receipt is ready to download.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-lg font-extrabold text-indigo-700">Little Steps</p>
                    <p className="mt-1 text-xs text-slate-500">Booking receipt</p>
                  </div>
                  <FileText className="text-indigo-600" size={28} />
                </div>

                <div className="space-y-4 py-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Booking reference</span>
                    <strong className="max-w-[60%] break-all text-right text-slate-800">{bookingId}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Provider</span>
                    <strong className="text-right text-slate-800">{providerName}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Booking date</span>
                    <strong className="text-right text-slate-800">{formattedDate}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Service time</span>
                    <strong className="text-right text-slate-800">
                      {startTime} – {endTime}{isOvernight ? ' (Overnight)' : ''}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Children</span>
                    <strong className="text-right text-slate-800">{childCount}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Payment method</span>
                    <strong className="text-right text-slate-800">
                      {paymentMethod === 'cash_after_service' ? 'Cash After Service' : paymentMethod === 'demo_upi' ? 'UPI Demo' : 'Not selected'}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Payment status</span>
                    <strong className={`text-right ${paymentMethod === 'cash_after_service' ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {getPaymentStatus()}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-4 text-lg">
                    <span className="font-bold text-slate-800">Total amount</span>
                    <strong className="text-indigo-700">${displayAmount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {paymentMethod === 'cash_after_service'
                  ? 'Booking successful. Cash payment is still due after the childcare service is completed. This receipt is not proof of payment.'
                  : paymentMethod === 'demo_upi'
                    ? 'Demo payment flow completed successfully. No real money was transferred; this is a demo receipt only.'
                    : 'Your booking has been saved successfully. Select a payment method later if required; this receipt confirms the booking details, not a payment.'}
              </div>

              <button
                type="button"
                onClick={downloadReceiptPDF}
                disabled={downloading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading
                  ? <LoaderCircle size={19} className="animate-spin" />
                  : <Download size={19} />}
                {downloading ? 'Generating your receipt...' : 'Download Your Receipt (PDF)'}
              </button>

              <button
                type="button"
                onClick={handleReceiptDone}
                className="w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <SecureIcon size={14} />
            <span>Little Steps · Booking reference for your records</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookingModal;
