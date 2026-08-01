"use client";

import { useState } from 'react';
import { Phone, Mail, Calendar, Users, BookOpen, Code, Cloud, ShoppingCart, CheckCircle, ArrowRight, Star, Award, Globe, Server, Database, Image, CreditCard, Layout, Shield, Zap, Rocket, Clock, Target, Briefcase, GraduationCap, FileText, Settings, Cpu, Layers, ExternalLink, Menu, X, AlertTriangle, Timer, Flame } from 'lucide-react';

export default function BootcampLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans antialiased">
      {/* LIMITED OFFER ALERT - RED BANNER */}
      <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white py-3 px-4 shadow-lg z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="animate-pulse">
              <Flame className="h-6 w-6 text-yellow-300" />
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-300" />
              <span className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                ⚡ LIMITED OFFER
              </span>
              <span className="hidden sm:inline-block w-px h-6 bg-white/30"></span>
              <span className="font-bold text-sm sm:text-base">
                Early Bird Discount: <span className="text-yellow-300">50% OFF</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
              <Timer className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-bold">Only 3 spots left!</span>
            </div>
            <a 
              href="#enroll" 
              className="bg-white text-red-600 px-5 py-1.5 rounded-full text-sm font-bold hover:bg-gray-100 transition shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Secure Your Spot
            </a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md shadow-sm z-40 border-b border-gray-100 top-[52px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Code className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">AI Masterclass</span>
              <span className="hidden sm:inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                Agency Pro
              </span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#curriculum" className="text-gray-600 hover:text-indigo-600 transition">Curriculum</a>
              <a href="#bonus" className="text-gray-600 hover:text-indigo-600 transition">Bonuses</a>
              <a href="#outcomes" className="text-gray-600 hover:text-indigo-600 transition">Outcomes</a>
              <a href="#enroll" className="bg-red-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-red-700 transition shadow-md hover:shadow-lg animate-pulse">
                🔥 Enroll Now
              </a>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-gray-600 hover:text-indigo-600">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 shadow-lg">
            <div className="px-4 pt-2 pb-4 space-y-3">
              <a href="#curriculum" className="block text-gray-600 hover:text-indigo-600 transition" onClick={() => setIsMenuOpen(false)}>Curriculum</a>
              <a href="#bonus" className="block text-gray-600 hover:text-indigo-600 transition" onClick={() => setIsMenuOpen(false)}>Bonuses</a>
              <a href="#outcomes" className="block text-gray-600 hover:text-indigo-600 transition" onClick={() => setIsMenuOpen(false)}>Outcomes</a>
              <a href="#enroll" className="block bg-red-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-red-700 transition text-center animate-pulse" onClick={() => setIsMenuOpen(false)}>
                🔥 Enroll Now
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium mb-6 animate-pulse">
                <AlertTriangle className="w-4 h-4 mr-2" />
                ⚡ LIMITED SPOTS AVAILABLE
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
                AI Website & <br />
                <span className="text-indigo-600">Digital Products</span> <br />
                <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">Masterclass</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-lg">
                14-Day Intensive Bootcamp. Build professional websites, integrate payments, and launch digital products using AI—no coding experience required.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#enroll" className="bg-red-600 text-white px-8 py-3.5 rounded-full text-lg font-semibold hover:bg-red-700 transition shadow-lg hover:shadow-xl flex items-center animate-pulse">
                  🔥 Enroll Now <ArrowRight className="ml-2 h-5 w-5" />
                </a>
                <a href="#curriculum" className="border border-gray-300 text-gray-700 px-8 py-3.5 rounded-full text-lg font-medium hover:bg-gray-50 transition flex items-center">
                  View Curriculum
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center"><Users className="h-4 w-4 mr-1" /> 3/30 spots left</span>
                <span className="flex items-center"><Clock className="h-4 w-4 mr-1" /> 14 days</span>
                <span className="flex items-center"><Award className="h-4 w-4 mr-1" /> Certificate</span>
                <span className="flex items-center text-red-600 font-bold"><Flame className="h-4 w-4 mr-1" /> 50% OFF</span>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-600 to-red-600 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-500 h-3 w-3 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Live Now</span>
                    </div>
                    <span className="text-xs text-gray-400">Bootcamp #7</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <span className="text-gray-600">Today's Session</span>
                      <span className="font-semibold text-indigo-600">Day 4: AI-Assisted Coding</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <span className="text-gray-600">Students Enrolled</span>
                      <span className="font-semibold">27</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Next Session</span>
                      <span className="font-semibold text-green-600">Today 6PM EAT</span>
                    </div>
                  </div>
                  <div className="mt-6 p-3 bg-red-50 rounded-xl text-red-800 text-sm flex items-center">
                    <Flame className="h-4 w-4 mr-2" />
                    <span>🔥 Only 3 spots remaining at this price!</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-3 border border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="bg-yellow-400 p-1.5 rounded-full">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-sm">4.9/5</span>
                  <span className="text-gray-400 text-sm">(34 reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar with Agency Focus */}
      <section className="py-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-red-600">14</p>
              <p className="text-sm text-gray-500">Training Days</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">3.5</p>
              <p className="text-sm text-gray-500">Hours Daily</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">10+</p>
              <p className="text-sm text-gray-500">Tools & Platforms</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">1</p>
              <p className="text-sm text-gray-500">Live Project</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-2xl font-bold text-red-600 animate-pulse">50%</p>
              <p className="text-sm text-gray-500">🔥 Early Bird Discount</p>
            </div>
          </div>
        </div>
      </section>

      {/* Agency Section */}
      <section className="py-16 bg-gradient-to-r from-red-50 to-orange-50 border-y border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium mb-4">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Agency-Built Websites
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Build Websites That <span className="text-red-600">Generate Revenue</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            This isn't just a coding bootcamp—it's a complete agency-building program. You'll learn how to create professional websites that attract clients, sell products, and build your digital empire.
          </p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: <Briefcase className="h-6 w-6" />, label: "Client-Ready Sites" },
              { icon: <ShoppingCart className="h-6 w-6" />, label: "E-Commerce Ready" },
              { icon: <Globe className="h-6 w-6" />, label: "Custom Domains" },
              { icon: <Zap className="h-6 w-6" />, label: "AI-Powered Workflow" },
            ].map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                <div className="text-red-600 flex justify-center">{item.icon}</div>
                <p className="text-sm font-medium mt-2">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section id="curriculum" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Course Curriculum</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Week-by-week breakdown of what you'll learn and build.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Week 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Calendar className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold">Week 1: Foundations</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 1:</strong> Course Orientation & Dev Setup (VS Code, Git, GitHub)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 2:</strong> VS Code Mastery (Shortcuts, Extensions, Terminal)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 3:</strong> Git & GitHub Mastery (Clone, Commit, Push, Branches)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 4:</strong> Building Websites with AI (HTML, CSS, Responsive)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 5:</strong> Firebase Backend (Auth, Firestore, Storage)</span>
                </li>
              </ul>
            </div>

            {/* Week 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Rocket className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold">Week 2: Advanced Integration</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 6:</strong> Cloudinary Media Management (Images, PDFs)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 7:</strong> Payment Gateway (Paystack, M-Pesa, Checkout)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 8:</strong> Hosting & Domains (Vercel, Truehost, SSL)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 9:</strong> Selling Digital Products (eBooks, Templates, Courses)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Day 10:</strong> AI Developer Workflow (OpenAI Codex, Claude Code)</span>
                </li>
              </ul>
            </div>

            {/* Week 3 */}
            <div className="md:col-span-2 bg-gradient-to-r from-indigo-50 to-red-50 rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-red-600 p-2 rounded-lg">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Week 3: Polish & Graduation</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <h4 className="font-bold text-indigo-600">Day 11</h4>
                  <p className="text-sm text-gray-600">Professional UI & UX (Typography, Colors, Mobile)</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <h4 className="font-bold text-indigo-600">Day 12</h4>
                  <p className="text-sm text-gray-600">Security & Performance (Firebase Rules, SEO)</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-200">
                  <h4 className="font-bold text-red-600">Day 13 & 14</h4>
                  <p className="text-sm text-gray-600">🔥 Production Deployment & Capstone Project</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bonus Pro Sessions */}
      <section id="bonus" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium mb-4">
              <Star className="w-4 h-4 mr-2" />
              Bonus Content
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Pro Sessions Included</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Extra lessons woven throughout the bootcamp to accelerate your career.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Developer Workflow", "VS Code Secrets", "GitHub Best Practices", 
              "Firebase Tips", "Cloudinary Optimization", "Vercel Deployment",
              "Domain Troubleshooting", "AI Prompt Engineering", "Performance Optimization",
              "Security Essentials", "Landing Page Conversion", "Portfolio Building",
              "Freelancing Tips", "Pricing Strategies", "Client Acquisition", "AI Responsibility"
            ].map((item, index) => (
              <div key={index} className="bg-white border border-gray-100 rounded-xl p-3 text-center hover:shadow-md transition">
                <span className="text-sm font-medium text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You'll Build */}
      <section id="outcomes" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">What You'll Build</h2>
            <p className="mt-4 text-lg text-gray-600">Every graduate leaves with a complete, production-ready portfolio.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Globe className="h-5 w-5" />, label: "Professional Website" },
              { icon: <ExternalLink className="h-5 w-5" />, label: "GitHub Portfolio" },
              { icon: <Server className="h-5 w-5" />, label: "Firebase Backend" },
              { icon: <Image className="h-5 w-5" />, label: "Cloudinary Storage" },
              { icon: <CreditCard className="h-5 w-5" />, label: "Payment Gateway" },
              { icon: <Layout className="h-5 w-5" />, label: "Custom Domain" },
              { icon: <Shield className="h-5 w-5" />, label: "SSL Certificate" },
              { icon: <ShoppingCart className="h-5 w-5" />, label: "Digital Product Store" },
            ].map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition">
                <div className="bg-indigo-50 p-2 rounded-full mb-2 text-indigo-600">
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Schedule */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Daily Schedule</h2>
              <p className="text-gray-600">Weekdays only · One focused session per day</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-indigo-50 rounded-2xl p-6 text-center">
                <Clock className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg">Live Training</h3>
                <p className="text-2xl font-bold text-indigo-600">6:00 – 8:30 PM</p>
                <p className="text-sm text-gray-600 mt-1">2.5 Hours</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-6 text-center">
                <Code className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg">Hands-on Lab</h3>
                <p className="text-2xl font-bold text-blue-600">8:30 – 9:30 PM</p>
                <p className="text-sm text-gray-600 mt-1">1 Hour Guided Practice</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-6 text-center">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg">Q&A Session</h3>
                <p className="text-2xl font-bold text-green-600">Daily</p>
                <p className="text-sm text-gray-600 mt-1">15-20 min live troubleshooting</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Deliverables */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
            <h2 className="text-3xl font-bold text-center mb-8">Your Final Deliverables</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Professional live website",
                "GitHub portfolio repository",
                "Firebase backend integration",
                "Cloudinary media storage",
                "Secure payment gateway",
                "Live Vercel deployment",
                "Custom Truehost domain",
                "SSL-secured website",
                "Digital product ready for sale",
                "Sales landing page",
                "AI-powered workflow",
                "Real-world portfolio project",
                "Certificate of Completion"
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-3 p-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">✅ {item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Perfect For</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {["Beginners (no coding)", "Entrepreneurs", "Freelancers", "Students", "Small Business Owners", "Career Changers"].map((item, index) => (
              <div key={index} className="bg-indigo-50 rounded-xl p-4 text-center font-medium text-gray-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enroll Section */}
      <section id="enroll" className="py-16 bg-gradient-to-r from-red-600 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium mb-4 animate-pulse">
            <Flame className="w-4 h-4 mr-2" />
            LIMITED OFFER
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Build Your Agency?</h2>
          <p className="mt-4 text-lg text-white/90">Enroll now and start your journey to becoming a professional web developer.</p>
          <div className="mt-6 bg-white/10 rounded-xl p-4 max-w-sm mx-auto">
            <p className="text-white font-bold text-2xl">50% OFF</p>
            <p className="text-white/80 text-sm">Early bird discount ends soon</p>
          </div>
          <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4">
            <a href="tel:254142225233" className="bg-white text-red-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition shadow-lg flex items-center">
              <Phone className="mr-2 h-5 w-5" /> Call: 254142225233
            </a>
            <a href="mailto:info@aimasterclass.com" className="bg-red-700 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-red-800 transition shadow-lg flex items-center">
              <Mail className="mr-2 h-5 w-5" /> Email Us
            </a>
          </div>
          <p className="mt-6 text-white/80 text-sm">⚠️ Only 3 spots left at this price. Secure your spot today.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-red-600 p-1.5 rounded-lg">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl text-white">AI Masterclass</span>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">Agency</span>
              </div>
              <p className="text-sm">Building the next generation of AI-powered developers and agency owners.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#curriculum" className="hover:text-red-400 transition">Curriculum</a></li>
                <li><a href="#bonus" className="hover:text-red-400 transition">Bonuses</a></li>
                <li><a href="#outcomes" className="hover:text-red-400 transition">Outcomes</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm flex items-center"><Phone className="h-4 w-4 mr-2" /> 254142225233</p>
              <p className="text-sm flex items-center mt-2"><Mail className="h-4 w-4 mr-2" /> info@aimasterclass.com</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            &copy; 2026 AI Masterclass Bootcamp. All rights reserved. | <span className="text-red-400">🔥 Limited Offer</span>
          </div>
        </div>
      </footer>
    </div>
  );
}