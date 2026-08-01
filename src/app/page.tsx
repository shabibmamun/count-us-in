'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useApp } from '@/context/AppContext';

export default function LandingPage() {
  const { user } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navigation Bar */}
      <header className="border-b border-border py-4 px-6 md:px-12 bg-white flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg tracking-wider text-primary">COUNT US IN</span>
        </div>
        <nav className="flex items-center gap-4">
          {user ? (
            <Link 
              href="/dashboard" 
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-all text-sm"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link 
                href="/login" 
                className="text-foreground hover:text-primary transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Link 
                href="/signup" 
                className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-all text-sm"
              >
                Start counting
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-6 md:px-12 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary text-primary rounded-full text-xs font-semibold tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            SHARED LIFE. SMARTER MONEY.
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary max-w-4xl mx-auto leading-tight mb-6">
            See where your money goes—together or on your own.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Count Us In brings income, spending, budgets and shared expenses into one simple view, whether you are budgeting privately or managing money with people you trust.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            {user ? (
              <Link 
                href="/dashboard" 
                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-md shadow-md hover:opacity-95 transition-all text-center"
              >
                Enter your space
              </Link>
            ) : (
              <>
                <Link 
                  href="/signup" 
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-md shadow-md hover:opacity-95 transition-all text-center"
                >
                  Start counting
                </Link>
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto px-8 py-4 border border-primary text-primary font-semibold rounded-md hover:bg-secondary transition-all text-center"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 bg-white border-y border-border px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-primary mb-12">
              Your money. Your people. One clear view.
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Benefit 1 */}
              <div className="p-6 rounded-lg bg-background border border-border">
                <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">One clear view</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track income, spending, budgets, savings and Zakat in one place.
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="p-6 rounded-lg bg-background border border-border">
                <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">Personal when it should be</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Keep private expenses private and share only what belongs to the group.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="p-6 rounded-lg bg-background border border-border">
                <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">Split costs fairly</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose who participated, who paid and how each shared expense should be divided.
                </p>
              </div>

              {/* Benefit 4 */}
              <div className="p-6 rounded-lg bg-background border border-border">
                <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center font-bold text-lg mb-4">
                  4
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">Built for real life</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use Count Us In alone, with family, with roommates, with friends or with another trusted group.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy statement */}
        <section className="py-16 px-6 md:px-12 text-center max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-primary mb-4">Our Privacy Commitment</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Your financial information remains under your control. Count Us In does not sell your information or use it for advertising. We store your data securely and allow you to export or delete your workspace history at any time.
          </p>
          <div className="text-xs text-muted-foreground border-t border-border pt-4 italic">
            Note: While we adhere to rigorous privacy standards, no online service can promise absolute or guaranteed security.
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary text-primary-foreground text-center px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ready to count yourself in?
            </h2>
            <p className="text-secondary max-w-xl mx-auto mb-8">
              Join today to build a simpler, fairer, and completely private view of your financial life.
            </p>
            <Link 
              href="/signup" 
              className="px-8 py-4 bg-accent text-accent-foreground font-semibold rounded-md shadow-md hover:opacity-95 transition-all text-center inline-block"
            >
              Create your space
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted-foreground bg-white">
        <p>&copy; {new Date().getFullYear()} COUNT US IN. All rights reserved. Made for private, personal and shared money management.</p>
      </footer>
    </div>
  );
}
