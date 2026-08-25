import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import { FaCalendarAlt, FaMapMarkerAlt, FaChair, FaMoneyBillWave } from 'react-icons/fa';

const OTP_RESEND_SECONDS = 30;

// Reusable row for the booking-details card so the four icon/label/value
// blocks aren't copy-pasted with only the icon and text changing
const DetailRow = ({ icon, label, children }) => (
    <div className="flex items-center gap-4 text-gray-600">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-400 uppercase">{label}</p>
            <p className="font-bold text-gray-800">{children}</p>
        </div>
    </div>
);

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [imageFailed, setImageFailed] = useState(false);
    const bookingConfirmed = useRef(false); // survives re-renders; drives the final disabled state

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const fetchEvent = async () => {
            try {
                const { data } = await api.get(`/events/${id}`);
                if (!cancelled) setEvent(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err.response?.status === 404 ? 'Event not found.' : 'Failed to load event details.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchEvent();
        return () => { cancelled = true; };
    }, [id]);

    // Countdown for the OTP resend button
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(s => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const sendOtp = useCallback(async () => {
        setBookingLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await api.post('/bookings/send-otp', { eventId: id });
            setShowOTP(true);
            setOtp('');
            setSuccessMsg('OTP sent to your email. Please verify to confirm booking.');
            setResendCooldown(OTP_RESEND_SECONDS);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send OTP');
        } finally {
            setBookingLoading(false);
        }
    }, [id]);

    const handleBooking = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!showOTP) {
            sendOtp();
            return;
        }

        setBookingLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await api.post('/bookings', { eventId: event._id, otp: otp.trim() });
            bookingConfirmed.current = true;
            setSuccessMsg('Booking requested! Awaiting admin confirmation.');
            setShowOTP(false);
            setEvent(prev => ({ ...prev, availableSeats: prev.availableSeats - 1 }));
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed. Check your OTP and try again.');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-xl font-semibold">Loading...</div>;
    if (!event) return <div className="text-center py-20 text-xl text-red-500">{error || 'Event not found'}</div>;

    const isSoldOut = event.availableSeats <= 0;
    const isDone = bookingConfirmed.current;
    const isDisabled = isSoldOut || bookingLoading || isDone || (showOTP && otp.trim().length !== 6);

    const buttonLabel = bookingLoading
        ? 'Processing...'
        : isDone
            ? 'Request Sent'
            : isSoldOut
                ? 'Sold Out'
                : showOTP
                    ? 'Verify OTP & Confirm'
                    : 'Confirm Registration';

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden mt-8">
            {event.imageUrl && !imageFailed ? (
                <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-80 object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <div className="w-full h-64 bg-gray-900 flex items-center justify-center text-white/50 text-6xl font-black uppercase tracking-widest">
                    {event.category}
                </div>
            )}

            <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                    <div>
                        <div className="inline-block bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                            {event.category}
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{event.title}</h1>
                        <p className="text-gray-600 text-lg leading-relaxed mb-6">{event.description}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 min-w-[300px] w-full md:w-auto shrink-0 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Booking Details</h3>

                        <div className="space-y-4 mb-8">
                            <DetailRow icon={<FaMoneyBillWave />} label="Ticket Price">
                                {event.ticketPrice === 0 ? <span className="text-green-500">Free</span> : `₹${event.ticketPrice}`}
                            </DetailRow>

                            <DetailRow icon={<FaChair />} label="Availability">
                                <span className={event.availableSeats < 10 ? 'text-orange-500' : ''}>{event.availableSeats}</span> / {event.totalSeats}
                            </DetailRow>

                            <DetailRow icon={<FaCalendarAlt />} label="Date">
                                {new Date(event.date).toLocaleDateString()}
                            </DetailRow>

                            <DetailRow icon={<FaMapMarkerAlt />} label="Location">
                                {event.location}
                            </DetailRow>
                        </div>

                        {showOTP && (
                            <div className="mb-4">
                                <label htmlFor="otp-input" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Enter OTP to Confirm
                                </label>
                                <input
                                    id="otp-input"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    required
                                    placeholder="6-digit code"
                                    autoComplete="one-time-code"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-700 transition shadow-sm font-bold tracking-widest text-center text-lg"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    maxLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={sendOtp}
                                    disabled={resendCooldown > 0 || bookingLoading}
                                    className="mt-2 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                                >
                                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleBooking}
                            disabled={isDisabled}
                            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition shadow-lg ${isSoldOut || isDone
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-black text-white hover:shadow-xl hover:-translate-y-1'
                                }`}
                        >
                            {buttonLabel}
                        </button>
                        <div aria-live="polite">
                            {error && <p className="text-red-500 mt-4 text-center font-medium bg-red-50 p-2 rounded">{error}</p>}
                            {successMsg && <p className="text-green-600 mt-4 text-center font-medium bg-green-50 p-2 rounded">{successMsg}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetail;