import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaRegClock, FaTicketAlt, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';

const Home = () => {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchEvents();
        }, 400); // 400ms debounce
        return () => {
            clearTimeout(timeoutId);
            if (abortRef.current) abortRef.current.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const fetchEvents = async () => {
        // Cancel any in-flight request so a slow earlier response can't
        // overwrite the result of a newer one (a classic race condition).
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get(`/events?search=${encodeURIComponent(search)}`, {
                signal: controller.signal,
            });
            setEvents(Array.isArray(data) ? data : []);
        } catch (err) {
            if (err.name === 'CanceledError' || err.name === 'AbortError') return;
            console.error('Error fetching events:', err);
            setError('We couldn\'t load events right now. Please try again.');
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <div className="relative bg-[#0B0B14] text-white rounded-[2rem] overflow-hidden mb-12 shadow-2xl border border-white/5">
                {/* Ambient glow orbs */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-fuchsia-600/30 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px]"></div>
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[90px]"></div>

                {/* Faint grid texture */}
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                ></div>

                <div className="relative p-10 md:p-24 flex flex-col items-center text-center z-10">
                    <span className="inline-flex items-center gap-2 bg-white/[0.06] text-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8 border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse"></span>
                        Live events, every day
                    </span>

                    <h1 className="font-black mb-6 leading-[0.95] tracking-tight text-6xl md:text-8xl">
                        Find your next
                        <br />
                        <span className="italic font-serif font-medium text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-orange-200 to-indigo-300">
                            unforgettable
                        </span>{' '}
                        experience
                    </h1>

                    <p className="text-white/60 text-lg md:text-xl mb-10 max-w-xl mx-auto font-normal leading-relaxed">
                        Tech conferences, late-night festivals, and hands-on workshops — happening near you. Secure your spot today.
                    </p>

                    <div className="w-full max-w-xl mx-auto relative flex items-center group">
                        <FaSearch className="absolute left-6 text-white/40 text-lg group-focus-within:text-[#0B0B14] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search events by title..."
                            aria-label="Search events by title"
                            className="w-full pl-14 pr-32 py-4 rounded-full text-base text-black bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_20px_50px_-12px_rgba(0,0,0,0.6)] border-0 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60 transition-all placeholder-gray-400 font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            type="button"
                            className="absolute right-1.5 bg-[#0B0B14] hover:bg-black text-white text-sm font-semibold px-5 py-3 rounded-full transition"
                        >
                            Search
                        </button>
                    </div>

                    <div className="flex items-center gap-6 mt-10 text-white/40 text-xs uppercase tracking-widest">
                        <span>4.9k+ events hosted</span>
                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                        <span>230 cities</span>
                    </div>
                </div>
            </div>

            {/* Why Choose Us / Features row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 px-4">
                <FeatureCard icon={<FaRegClock />} title="Fast Booking" text="Secure your tickets instantly with a booking flow built for speed." />
                <FeatureCard icon={<FaTicketAlt />} title="Seamless Access" text="Download tickets instantly or manage them from your personal dashboard." />
                <FeatureCard icon={<FaShieldAlt />} title="Secure Platform" text="Every transaction is protected by 2FA and modern security practices." />
            </div>

            <div className="flex items-end justify-between mb-10 px-2">
                <div>
                    <span className="text-xs font-bold tracking-widest uppercase text-fuchsia-600 mb-2 block">Happening soon</span>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Upcoming Events</h2>
                </div>
                {!loading && !error && (
                    <div className="text-gray-400 font-medium text-sm mb-1">{events.length} result{events.length === 1 ? '' : 's'} found</div>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                    <FaExclamationTriangle className="text-3xl text-gray-400" />
                    <p className="text-lg text-gray-600">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="bg-gray-900 text-white font-semibold px-6 py-2 rounded-lg hover:bg-gray-800 transition"
                    >
                        Try again
                    </button>
                </div>
            ) : events.length === 0 ? (
                <div className="text-center py-20 text-xl text-gray-500">
                    {search ? `No events found for "${search}".` : 'No events available yet — check back soon.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {events.map(event => <EventCard key={event._id} event={event} />)}
                </div>
            )}

            {/* Footer Section */}
            <footer className="mt-auto pt-16 pb-8 border-t border-gray-200 text-center">
                <div className="flex justify-center items-center gap-2 mb-4">
                    <FaTicketAlt className="text-gray-800 text-2xl" />
                    <span className="text-xl font-bold text-gray-900">Eventora</span>
                </div>
                <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                    The simplest, most dynamic way to manage, discover, and host world-class events in your local city. Let's make memories together.
                </p>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    &copy; {new Date().getFullYear()} Eventora Platform. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, text }) => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:-translate-y-1 transition duration-300">
        <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-md shadow-gray-200/50">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{text}</p>
    </div>
);

// Deterministic accent per category so the same category always gets the
// same color, without needing a lookup table maintained by hand.
const ACCENTS = [
    { grad: 'from-fuchsia-500 to-purple-600', text: 'text-fuchsia-600', ring: 'ring-fuchsia-100' },
    { grad: 'from-indigo-500 to-blue-600', text: 'text-indigo-600', ring: 'ring-indigo-100' },
    { grad: 'from-amber-500 to-orange-600', text: 'text-amber-600', ring: 'ring-amber-100' },
    { grad: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    { grad: 'from-rose-500 to-pink-600', text: 'text-rose-600', ring: 'ring-rose-100' },
];
const accentFor = (label = '') => {
    let hash = 0;
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    return ACCENTS[hash % ACCENTS.length];
};

const EventCard = ({ event }) => {
    const [imgError, setImgError] = useState(false);
    const total = event.totalSeats || 0;
    const available = event.availableSeats ?? 0;
    const percentLeft = total > 0 ? Math.min(100, Math.max(0, (available / total) * 100)) : 0;
    const almostFull = total > 0 && percentLeft <= 20;
    const accent = accentFor(event.category);

    const dateObj = event.date ? new Date(event.date) : null;
    const dateLabel = dateObj
        ? dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        : 'TBA';

    return (
        <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
            <div className="h-52 overflow-hidden relative">
                {event.imageUrl && !imgError ? (
                    <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${accent.grad} text-white font-black text-3xl tracking-tight`}>
                        {event.category || 'Event'}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>

                {/* Day/month block, top-left */}
                <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-1.5 text-center shadow-md leading-tight">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        {dateObj ? dateObj.toLocaleDateString(undefined, { month: 'short' }) : '—'}
                    </div>
                    <div className="text-lg font-black text-gray-900 -mt-0.5">
                        {dateObj ? dateObj.getDate() : '?'}
                    </div>
                </div>

                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                    {event.ticketPrice === 0 ? <span className="text-emerald-600">FREE</span> : <span className="text-gray-900">₹{event.ticketPrice}</span>}
                </div>

                {almostFull && (
                    <div className="absolute bottom-4 left-4 bg-rose-600 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-md">
                        Almost full
                    </div>
                )}
            </div>

            <div className="p-6 flex-grow flex flex-col">
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${accent.text}`}>{event.category || 'General'}</div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 leading-snug line-clamp-2">{event.title}</h2>

                <div className="flex flex-col gap-1.5 mb-5 text-gray-500 text-sm">
                    <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-300 shrink-0" />
                        <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-gray-300 shrink-0" />
                        <span className="truncate">{event.location}</span>
                    </div>
                </div>

                <div className="mt-auto">
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
                        <div
                            className={`h-1.5 rounded-full bg-gradient-to-r ${accent.grad}`}
                            style={{ width: `${percentLeft}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                        {total > 0 ? `${available} of ${total} seats left` : 'Seat count unavailable'}
                    </p>
                    <Link
                        to={`/events/${event._id}`}
                        className="block w-full text-center bg-gray-900 hover:bg-black text-white font-semibold py-2.5 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                    >
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    );
};

const EventCardSkeleton = () => (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col animate-pulse">
        <div className="h-52 bg-gray-100"></div>
        <div className="p-6 flex-grow flex flex-col gap-3">
            <div className="h-3 w-16 bg-gray-100 rounded"></div>
            <div className="h-5 w-3/4 bg-gray-100 rounded"></div>
            <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
            <div className="h-3 w-2/3 bg-gray-100 rounded"></div>
            <div className="mt-auto h-10 bg-gray-100 rounded-xl"></div>
        </div>
    </div>
);

export default Home;