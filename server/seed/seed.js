require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing Little Steps records...');
    await Promise.all([
      User.deleteMany({}),
      ProviderProfile.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('[Seed] Creating demo accounts...');

    // 1. Admin Account
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@littlesteps.com',
      password: 'Admin@12345',
      role: 'admin',
      phone: '+1 (555) 019-2831',
      address: {
        street: '100 Little Steps Way',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105'
      }
    });

    // 2. Verified 24x7 Provider - Sarah Johnson
    const sarahUser = await User.create({
      name: 'Sarah Johnson, RN',
      email: 'sarah.provider@littlesteps.com',
      password: 'Provider@123',
      role: 'provider',
      phone: '+1 (555) 432-8765',
      address: {
        street: '452 Willow Lane',
        city: 'San Francisco',
        state: 'CA',
        zip: '94107'
      }
    });

    const sarahProfile = await ProviderProfile.create({
      user: sarahUser._id,
      bio: 'Registered pediatric nurse with 8+ years of dedicated childcare experience. Specialized in newborn care, overnight 24/7 care, and emergency pediatric first aid. Certified baby whisperer!',
      experienceYears: 8,
      services: [
        'Infant Care (0-1 yr)',
        'Toddler Care (1-3 yrs)',
        'Overnight / 24x7 Care',
        'Special Needs Support',
        'Emergency Drop-in'
      ],
      hourlyRate: 35,
      overnightRate: 45,
      maxCapacity: 3,
      is24x7Available: true,
      verificationStatus: 'verified',
      city: 'San Francisco',
      rating: 4.9,
      reviewCount: 14,
      isFeatured: true,
      certifications: [
        'Registered Nurse (RN) - Pediatrics',
        'Certified Pediatric CPR & First Aid (AHA)',
        'Licensed Home Childcare Specialist',
        'Newborn & Infant Sleep Consultant'
      ],
      verificationDocuments: [
        {
          docType: 'Government ID',
          fileName: 'sarah_california_dl.pdf',
          status: 'verified',
          documentUrl: 'https://storage.littlesteps.local/docs/sarah_dl.pdf'
        },
        {
          docType: 'Criminal Background Check',
          fileName: 'fbi_clearance_cert_sarah.pdf',
          status: 'verified',
          documentUrl: 'https://storage.littlesteps.local/docs/sarah_bg.pdf'
        },
        {
          docType: 'CPR & First Aid Certificate',
          fileName: 'aha_pediatric_cpr_cert.pdf',
          status: 'verified',
          documentUrl: 'https://storage.littlesteps.local/docs/sarah_cpr.pdf'
        }
      ]
    });

    // 3. Verified Daytime Provider - Maria Garcia
    const mariaUser = await User.create({
      name: 'Maria Garcia, ECE',
      email: 'maria.provider@littlesteps.com',
      password: 'Provider@123',
      role: 'provider',
      phone: '+1 (555) 321-9876',
      address: {
        street: '782 Sunset Boulevard',
        city: 'San Francisco',
        state: 'CA',
        zip: '94122'
      }
    });

    const mariaProfile = await ProviderProfile.create({
      user: mariaUser._id,
      bio: 'Bilingual early childhood educator with 6 years experience running structured learning and fun play routines. Patient, creative, and gentle with toddlers and preschoolers.',
      experienceYears: 6,
      services: [
        'Toddler Care (1-3 yrs)',
        'Preschool Care (3-5 yrs)',
        'After-School Care',
        'Weekend Care'
      ],
      hourlyRate: 28,
      overnightRate: 35,
      maxCapacity: 4,
      is24x7Available: false,
      verificationStatus: 'verified',
      city: 'San Francisco',
      rating: 4.8,
      reviewCount: 9,
      isFeatured: false,
      certifications: [
        'Early Childhood Education Associate Degree',
        'Red Cross Pediatric First Aid & CPR',
        'Bilingual (English & Spanish)'
      ],
      verificationDocuments: [
        {
          docType: 'Government ID',
          fileName: 'maria_id.pdf',
          status: 'verified',
          documentUrl: 'https://storage.littlesteps.local/docs/maria_id.pdf'
        },
        {
          docType: 'Criminal Background Check',
          fileName: 'background_check_maria.pdf',
          status: 'verified',
          documentUrl: 'https://storage.littlesteps.local/docs/maria_bg.pdf'
        }
      ]
    });

    // 4. Pending Provider - David Kim (awaiting admin review)
    const davidUser = await User.create({
      name: 'David Kim',
      email: 'david.provider@littlesteps.com',
      password: 'Provider@123',
      role: 'provider',
      phone: '+1 (555) 789-0123',
      address: {
        street: '124 Market Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102'
      }
    });

    const davidProfile = await ProviderProfile.create({
      user: davidUser._id,
      bio: 'Montessori-trained child supervisor with 4 years experience. Enthusiastic about creative arts, outdoor activities, and cognitive development exercises.',
      experienceYears: 4,
      services: [
        'Preschool Care (3-5 yrs)',
        'After-School Care',
        'Weekend Care'
      ],
      hourlyRate: 24,
      overnightRate: 30,
      maxCapacity: 2,
      is24x7Available: false,
      verificationStatus: 'pending',
      city: 'San Francisco',
      rating: 5.0,
      reviewCount: 0,
      isFeatured: false,
      certifications: ['Montessori Teacher Assistant Credential', 'First Aid Certified'],
      verificationDocuments: [
        {
          docType: 'Government ID',
          fileName: 'david_state_id.pdf',
          status: 'pending',
          documentUrl: 'https://storage.littlesteps.local/docs/david_id.pdf'
        },
        {
          docType: 'Criminal Background Check',
          fileName: 'david_livescan_clearance.pdf',
          status: 'pending',
          documentUrl: 'https://storage.littlesteps.local/docs/david_livescan.pdf'
        }
      ]
    });

    // 5. Parent Account - Emily Davis
    const emilyParent = await User.create({
      name: 'Emily Davis',
      email: 'emily.parent@littlesteps.com',
      password: 'Parent@123',
      role: 'parent',
      phone: '+1 (555) 987-6543',
      address: {
        street: '234 Green Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94133'
      },
      children: [
        {
          name: 'Leo Davis',
          age: 3,
          allergies: ['Peanuts', 'Dairy (mild)'],
          specialNeeds: 'Carries EpiPen in backpack',
          notes: 'Loves building blocks and storytime before bed.'
        },
        {
          name: 'Chloe Davis',
          age: 6,
          allergies: [],
          specialNeeds: '',
          notes: 'Independent, loves coloring and puzzles.'
        }
      ]
    });

    // 6. Parent Account 2 - Michael Chang
    const michaelParent = await User.create({
      name: 'Michael Chang',
      email: 'michael.parent@littlesteps.com',
      password: 'Parent@123',
      role: 'parent',
      phone: '+1 (555) 654-3210',
      address: {
        street: '567 Mission Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105'
      },
      children: [
        {
          name: 'Oliver Chang',
          age: 1,
          allergies: ['None'],
          specialNeeds: '',
          notes: 'Needs formula bottle every 3 hours; naps around 1pm.'
        }
      ]
    });

    // 7. Seed Bookings
    console.log('[Seed] Seeding sample bookings...');

    // Booking 1: Past Completed Booking with Sarah (Reviewed)
    const pastBooking = await Booking.create({
      parent: emilyParent._id,
      provider: sarahUser._id,
      providerProfile: sarahProfile._id,
      childDetails: [emilyParent.children[0]],
      numberOfChildren: 1,
      dateString: '2026-10-10',
      startTime: '18:00',
      endTime: '22:00',
      isOvernight: false,
      totalHours: 4,
      hourlyRate: 35,
      subtotal: 140,
      platformFee: 5,
      totalAmount: 145,
      status: 'completed',
      emergencyContact: {
        name: 'Emily Davis',
        phone: '+1 (555) 987-6543',
        relation: 'Mother'
      },
      specialInstructions: 'Leo usually falls asleep around 8:30pm with his teddy bear.'
    });

    // Review for past booking
    await Review.create({
      booking: pastBooking._id,
      parent: emilyParent._id,
      provider: sarahUser._id,
      rating: 5,
      comment: 'Sarah was absolutely wonderful with Leo! She was extremely cautious with his peanut allergy and sent regular photo updates. We slept peacefully knowing our son was in such loving and competent hands!'
    });

    // Booking 2: Confirmed Upcoming Overnight Booking with Sarah (2 children, Leo & Chloe)
    const confirmedBooking = await Booking.create({
      parent: emilyParent._id,
      provider: sarahUser._id,
      providerProfile: sarahProfile._id,
      childDetails: [emilyParent.children[0], emilyParent.children[1]],
      numberOfChildren: 2,
      dateString: '2026-10-25',
      startTime: '19:00',
      endTime: '07:00',
      isOvernight: true,
      totalHours: 12,
      hourlyRate: 45,
      subtotal: 1080,
      platformFee: 5,
      totalAmount: 1085,
      status: 'confirmed',
      emergencyContact: {
        name: 'Robert Davis',
        phone: '+1 (555) 987-6544',
        relation: 'Father'
      },
      specialInstructions: 'Overnight stay. Extra blankets are in the guest closet.'
    });

    // Booking 3: Pending Booking with Maria (Oliver Chang)
    const pendingBooking = await Booking.create({
      parent: michaelParent._id,
      provider: mariaUser._id,
      providerProfile: mariaProfile._id,
      childDetails: [michaelParent.children[0]],
      numberOfChildren: 1,
      dateString: '2026-10-22',
      startTime: '09:00',
      endTime: '13:00',
      isOvernight: false,
      totalHours: 4,
      hourlyRate: 28,
      subtotal: 112,
      platformFee: 5,
      totalAmount: 117,
      status: 'pending',
      emergencyContact: {
        name: 'Michael Chang',
        phone: '+1 (555) 654-3210',
        relation: 'Father'
      },
      specialInstructions: 'Please give milk bottle at 10:30am.'
    });

    // Notifications
    await Notification.create([
      {
        user: sarahUser._id,
        title: 'Upcoming Confirmed Care',
        message: 'You have an overnight booking on Oct 25 with Emily Davis (2 children).',
        type: 'booking',
        link: '/provider/dashboard'
      },
      {
        user: mariaUser._id,
        title: 'New Booking Request',
        message: 'Michael Chang requested care for Oliver on Oct 22 (09:00 - 13:00).',
        type: 'booking',
        link: '/provider/dashboard'
      },
      {
        user: admin._id,
        title: 'Pending Provider Verification',
        message: 'David Kim submitted credentials for Little Steps background review.',
        type: 'verification',
        link: '/admin/dashboard'
      }
    ]);

    console.log('[Seed] Database populated successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Accounts Created:');
    console.log('  Admin:             admin@littlesteps.com / Admin@12345');
    console.log('  Verified Provider: sarah.provider@littlesteps.com / Provider@123');
    console.log('  Daytime Provider:  maria.provider@littlesteps.com / Provider@123');
    console.log('  Pending Provider:  david.provider@littlesteps.com / Provider@123');
    console.log('  Parent 1:          emily.parent@littlesteps.com / Parent@123');
    console.log('  Parent 2:          michael.parent@littlesteps.com / Parent@123');
    console.log('----------------------------------------------------');

    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
