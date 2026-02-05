import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

/**
 * Home Component 
 * Serves as the primary landing page, featuring platform information 
 * and an automated testimonial slider 
 */
const Home: React.FC = () => {
  const navigate = useNavigate();
  
  // Data source for the 'You're Not Alone section 
  const testimonials = [
    {
      quote: "I had a stutter as a kid and singing really helped me get over it.",
      author: "Ed Sheeran (Singer-Songwriter and Musician)"
    },
    {
      quote: "I stammered as a child and it was incredibly frustrating. But I learned to embrace it and use it as a strength.",
      author: "Samuel L. Jackson (Actor and Film Producer)"
    },
    {
      quote: "Having a stutter taught me patience and the importance of listening. It shaped who I am today.",
      author: "Emily Blunt (Actress)"
    },
    {
      quote: "Those who stutter win, in the painful pauses of their demonstration that speech isn’t entirely natural; a respectful attention, a tender alertness. Words are, we are reassured, precious.",
      author: "John Updike (Author)"
    },
    {
        quote: "It’s nothing to be ashamed of to have a stutter. There is absolutely, 100 percent, a light at the end of the tunnel for everyone who stutters.",
        author: "Emily Blunt (Actress)"
    },
    {
      quote: "Everything you think is wrong with you is actually right because that makes you an individual, and that makes you an even more interesting human. That makes you, you.",
      author: "Ed Sheeran (Singer-Songwriter and Musician)"
    },
    {
      quote: "If you can live through a childhood of stuttering, you can live through anything. And if you go into adulthood still stuttering, you can handle anything. You have been tempered by the fire.",
      author: "David Seidler (Playwright and Film Writer)"
    },
    {
      quote: "I don't remember feeling ashamed of my stutter. I remember feeling sorry for people who thought there was something wrong with me.",
      author: "Bill Withers (Singer-Songwriter)"
    },
    {
      quote: "I'm like, 'Mmm, no, not quite, I know it sounds good in a soundbite, you know. But it's not true. I will always be one (someone who stutters), and be one proudly.'",
      author: "Emily Blunt (Actress)"
    },
    {
      quote: "I have my days. I have 'G' days, I have 'B' days, I have 'T' days, I have 'P' days. I have 'S' days, and I'm still a stutterer.",
      author: "Samuel L. Jackson (Actor and Film Producer)"
    },
    {
      quote: "It was actually like a weight being lifted and from then on I've always talked about it because it helps me… People keep it bottled up, but that's what makes it harder. If you actually open up then you can end up making speeches.",
      author: "Ed Balls (Former Labour Cabinet Member)"
    },
    {
        quote: "Sometimes if I'm very nervous or excited or something I stutter... In fact, one time they were doing a… I had a small part in a movie… when I got into the scene, instead of my lines I said 'W-w-w', and the director came up, he was furious, he said, 'You don't stutter!'. I said, 'That's what you think!'.",
        author: "Marilyn Monroe (Actress and Model)"
    },
    {
      quote: "You have nothing, nothing, nothing to be ashamed of and every reason to be proud… you will find it will not be the impediment that keeps you from realising your dreams.",
      author: "Joe Biden (Former United States President)"
    },
    {
      quote: "What it does give you is a very, very finely-tuned hypersensitivity to words and also to grammar. Even as a really young child, a stammerer will be able to think of five different ways to say the same thing so that you can avoid your potential minefield letters or sounds or words. As a young child, you learn to become your own editor...and you're doing it on the spot, in your head, all the time.",
      author: "Maggie O'Farrell (Novelist; Author of 'Hamnet')"
    },
    {
      quote: "It could have made me shy away from talking... But just before I headed off to high school, I decided to speak out… We had this public speaking competition… I stood up in front of the whole school and spoke for 10 minutes about my stammer and I won the competition.",
      author: "Hayley Hassall (Investigative Journalist and BBC Presenter)"
    },
    {
      quote: "I just want children to know that it's OK. Some of the most affluent, richest, raddest, talented people in the world stutter… It never goes away and I still stutter to this day… but once I said to myself that it's OK,",
      author: "Shaquille 'Shaq' O’Neal (Basketball Player and TV Pundit)"
    },
    {
      quote: "I am living proof that anything is possible. I managed to follow my passion and not let my stammer become a stumbling block in my career.",
      author: "James Davies (Osteopath)"
    },
    {
      quote: "I would tell them to have courage. I would tell the parents to give them the time they need to express themself in the best way possible. That's what I had in my home: a mum who listened, a grandad who listened, a dad and a brother who listened. That makes all the difference.",
      author: "João Gomes (Wolverhampton Wanderers Footballer)"
    }
  ];
  
// Auto rotate the testimonials (Carousel state)
const [currentTestimonial, setCurrentTestimonial] = useState(0);
const [direction, setDirection] = useState<'left' | 'right'>('right');

const intervalRef = useRef<number | null>(null);

const ROTATE_MS = 3000; // Duration of each testimonial stays on screen (3 seconds)

/**
 * Clears any existing timer and starts a new 3-second interval 
 * to automatically advance the testimonial slider 
 */
const startAutoRotate = () => {
  if (intervalRef.current) window.clearInterval(intervalRef.current);

  intervalRef.current = window.setInterval(() => {
    setDirection('right');

    // Functional update ensures we always have the latest index
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  }, ROTATE_MS);
};

/**
 * Initialise the rotation in mount and clean up the interval on unmount to prevent memory leaks 
 */
useEffect(() => {
  startAutoRotate();
  return () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  };
}, [testimonials.length]);

/**
 * Navigation handlers 
 */

  // Navigate to next testimonial and resets the auto-rotation timer
  const nextTestimonial = () => {
    setDirection('right');
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    startAutoRotate();
  };
  
  // Goes to the previous slide using modulo math to wrap around to the end 
  const prevTestimonial = () => {
    setDirection('left');
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    startAutoRotate();
  };
  
  
  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <h1 className="nav-logo">OwnUrVoice</h1>
          <button className="nav-register-btn" onClick={() => navigate('/register')}>
            Register
          </button>
        </div>
      </nav>

{/* Hero Section: Main Visual and Call to Action */}
<section className="hero-section">
<img
  className="hero-image"
  src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  alt="Community support hands together"
/>


  <div className="hero-overlay">
    <div className="hero-content">
      <h1 className="hero-title">Own Your Voice</h1>
      <p className="hero-description">
        A comprehensive platform connecting speech therapists, patients, and
        families in the journey toward confident communication.
      </p>

      <button className="hero-cta" onClick={() => navigate("/register")}>
        Get Started Today
      </button>
    </div>
  </div>
</section>


      {/* Info section: Highlights specific value for each user type */}
      <section className="how-it-works-section">
        <h2 className="section-title">How OwnUrVoice Works</h2>
        <div className="features-container">

          {/* Therapist Card */}
          <div className="feature-card">
            <div className="feature-icon therapist-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h3 className="feature-title">For Therapists</h3>
            <p className="feature-description">
              Manage patient sessions, track progress, assign exercises, and share resources - all in one place.
            </p>
          </div>

          {/* Patient Card */}
          <div className="feature-card">
            <div className="feature-icon patient-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            </div>
            <h3 className="feature-title">For Patients</h3>
            <p className="feature-description">
              Access your therapy goals, complete exercises, journal your progress, and connect with a supportive community.
            </p>
          </div>

          {/* Parents & Carers Card */}
          <div className="feature-card">
            <div className="feature-icon parents-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="feature-title">For Parents & Carers</h3>
            <p className="feature-description">
              Stay informed about your child's progress, view their goals and exercises, and access helpful resources.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonial Section: Interactive Carousel */}
      <section className="testimonials-section">
        <h2 className="section-title">You're Not Alone</h2>
        <div className="testimonial-container">
          <button className="testimonial-nav-btn prev-btn" onClick={prevTestimonial}>
            ‹
          </button>
          
          <div key={`${currentTestimonial}-${direction}`}
            className={`testimonial-card ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>

            <div className="quote-icon">"</div>
            <p className="testimonial-text">
              {testimonials[currentTestimonial].quote}
            </p>
            <p className="testimonial-author">— {testimonials[currentTestimonial].author}</p>
          </div>

          <button className="testimonial-nav-btn next-btn" onClick={nextTestimonial}>
            ›
          </button>
        </div>

        {/* Navigation Dots */}
        <div className="testimonial-dots">
          {testimonials.map((_, index) => (
            <span 
              key={index}
              className={`dot ${index === currentTestimonial ? 'active' : ''}`}
              onClick={() => {
                setDirection(index > currentTestimonial ? 'right' : 'left');
                setCurrentTestimonial(index);
                startAutoRotate();
              }}
              
              
            ></span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>OwnUrVoice</h3>
            <p>Empowering individuals with speech challenges through innovative therapy and support.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 OwnUrVoice. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;