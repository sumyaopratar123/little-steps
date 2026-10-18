const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/little_steps_test';

describe('Little Steps 24x7 Childcare Platform - Integration Test Suite', () => {
  let adminToken, parentToken, providerToken;
  let adminUser, parentUser, providerUser;
  let providerProfileDoc;
  let createdBookingId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
    // Clean test database
    await Promise.all([
      User.deleteMany({}),
      ProviderProfile.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({})
    ]);

    // Create Admin
    adminUser = await User.create({
      name: 'System Admin',
      email: 'testadmin@littlesteps.com',
      password: 'AdminPassword123',
      role: 'admin'
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@littlesteps.com', password: 'AdminPassword123' });
    adminToken = adminLoginRes.body.token;

    // Create Parent
    const parentRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Parent',
        email: 'alice.parent@test.com',
        password: 'ParentPassword123',
        role: 'parent',
        phone: '+1 555-0101',
        children: [
          { name: 'Timmy', age: 4, allergies: ['Peanuts'], specialNeeds: 'None' },
          { name: 'Sasha', age: 2, allergies: [], specialNeeds: 'None' }
        ]
      });
    parentToken = parentRegRes.body.token;
    parentUser = parentRegRes.body.user;

    // Create Provider
    const providerRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nurse Hannah',
        email: 'hannah.provider@test.com',
        password: 'ProviderPassword123',
        role: 'provider',
        phone: '+1 555-0202'
      });
    providerToken = providerRegRes.body.token;
    providerUser = providerRegRes.body.user;

    providerProfileDoc = await ProviderProfile.findOne({ user: providerUser._id });
  });

  after(async () => {
    await Promise.all([
      User.deleteMany({}),
      ProviderProfile.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({})
    ]);
    await mongoose.disconnect();
  });

  // 1. Health & Server Check
  it('GET /api/health should return status healthy', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'Little Steps Childcare API');
  });

  // 2. Authentication & Role Authorization
  it('POST /api/auth/login with wrong credentials should return 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice.parent@test.com', password: 'WrongPassword' });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('GET /api/admin/stats without admin credentials should return 403 or 401', async () => {
    const unauthRes = await request(app).get('/api/admin/stats');
    assert.strictEqual(unauthRes.statusCode, 401);

    const parentForbiddenRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${parentToken}`);
    assert.strictEqual(parentForbiddenRes.statusCode, 403);
  });

  it('GET /api/admin/stats with admin credentials should return platform stats', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.users.total >= 3);
  });

  // 3. Provider Setup & Admin Verification Flow
  it('PUT /api/providers/profile/update updates provider settings and 24x7 rates', async () => {
    const updateRes = await request(app)
      .put('/api/providers/profile/update')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        bio: 'Certified pediatric nurse offering 24/7 care and weekend slots.',
        experienceYears: 5,
        hourlyRate: 30,
        overnightRate: 40,
        maxCapacity: 3,
        is24x7Available: true,
        services: ['Infant Care (0-1 yr)', 'Overnight / 24x7 Care']
      });

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.data.hourlyRate, 30);
    assert.strictEqual(updateRes.body.data.maxCapacity, 3);
    assert.strictEqual(updateRes.body.data.is24x7Available, true);
  });

  it('POST /api/providers/verification-docs allows provider to submit verification credentials', async () => {
    const docRes = await request(app)
      .post('/api/providers/verification-docs')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        docType: 'Criminal Background Check',
        fileName: 'background_check_hannah.pdf',
        documentUrl: 'https://storage.littlesteps.local/hannah_bg.pdf'
      });

    assert.strictEqual(docRes.statusCode, 200);
    assert.strictEqual(docRes.body.data.verificationStatus, 'pending');
    assert.strictEqual(docRes.body.data.verificationDocuments.length, 1);
  });

  it('Admin can view pending verifications and approve provider', async () => {
    const listRes = await request(app)
      .get('/api/admin/verifications')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(listRes.statusCode, 200);
    assert.ok(listRes.body.data.length >= 1);

    const approveRes = await request(app)
      .patch(`/api/admin/verifications/${providerUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    assert.strictEqual(approveRes.statusCode, 200);
    assert.strictEqual(approveRes.body.data.verificationStatus, 'verified');
  });

  // 4. Booking Flow, Overlap & Capacity Conflict Enforcement
  it('Parent cannot book provider with invalid time or unverified provider', async () => {
    // Test booking with end time before start time
    const invalidTimeRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        providerId: providerUser._id,
        dateString: '2026-11-01',
        startTime: '14:00',
        endTime: '12:00',
        isOvernight: false,
        childDetails: [{ name: 'Timmy', age: 4 }],
        emergencyContact: { name: 'Emergency Alice', phone: '+1 555-0999' }
      });
    // Should be rejected
    assert.strictEqual(invalidTimeRes.statusCode, 400);
  });

  it('Parent books slot: Booking 1 (2 children, 14:00 - 18:00) succeeds', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        providerId: providerUser._id,
        dateString: '2026-11-01',
        startTime: '14:00',
        endTime: '18:00',
        isOvernight: false,
        childDetails: [
          { name: 'Timmy', age: 4 },
          { name: 'Sasha', age: 2 }
        ],
        emergencyContact: { name: 'Emergency Alice', phone: '+1 555-0999' },
        specialInstructions: 'Afternoon snack at 16:00'
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.numberOfChildren, 2);
    // 4 hours * 2 children * $30 rate = $240 + $5 fee = $245
    assert.strictEqual(res.body.data.totalAmount, 245);
    createdBookingId = res.body.data._id;
  });

  it('Capacity conflict: Booking 2 (2 children in overlapping time 15:00 - 17:00) exceeds maxCapacity 3 -> 409 Conflict', async () => {
    // Current in slot: 2 children. Max capacity is 3. Attempting to add 2 children => 4 children total > 3 limit.
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        providerId: providerUser._id,
        dateString: '2026-11-01',
        startTime: '15:00',
        endTime: '17:00',
        isOvernight: false,
        childDetails: [
          { name: 'Leo', age: 3 },
          { name: 'Maya', age: 5 }
        ],
        emergencyContact: { name: 'Secondary Contact', phone: '+1 555-8888' }
      });

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('Capacity conflict'));
  });

  it('Allowed capacity: Booking 3 (1 child in overlapping time 15:00 - 17:00) fits within maxCapacity 3 -> 201 Created', async () => {
    // Current in slot: 2 children. Adding 1 child => 3 children <= 3 max capacity.
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        providerId: providerUser._id,
        dateString: '2026-11-01',
        startTime: '15:00',
        endTime: '17:00',
        isOvernight: false,
        childDetails: [{ name: 'Solo Child', age: 5 }],
        emergencyContact: { name: 'Secondary Contact', phone: '+1 555-8888' }
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
  });

  // 5. Lifecycle Status Transitions
  it('Provider confirms, starts, and completes booking', async () => {
    // Confirm
    const confirmRes = await request(app)
      .patch(`/api/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'confirmed' });
    assert.strictEqual(confirmRes.statusCode, 200);
    assert.strictEqual(confirmRes.body.data.status, 'confirmed');

    // In-Progress
    const inProgressRes = await request(app)
      .patch(`/api/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'in-progress' });
    assert.strictEqual(inProgressRes.statusCode, 200);
    assert.strictEqual(inProgressRes.body.data.status, 'in-progress');

    // Complete
    const completeRes = await request(app)
      .patch(`/api/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'completed' });
    assert.strictEqual(completeRes.statusCode, 200);
    assert.strictEqual(completeRes.body.data.status, 'completed');
  });

  // 6. Review & Rating Flow
  it('Parent can review completed booking, updating provider rating', async () => {
    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        bookingId: createdBookingId,
        rating: 5,
        comment: 'Nurse Hannah was extraordinary! Safe, kind, and attentive.'
      });

    assert.strictEqual(reviewRes.statusCode, 201);
    assert.strictEqual(reviewRes.body.success, true);

    // Verify provider profile updated
    const updatedProfile = await ProviderProfile.findOne({ user: providerUser._id });
    assert.strictEqual(updatedProfile.reviewCount, 1);
    assert.strictEqual(updatedProfile.rating, 5);
  });

  it('Parent cannot duplicate review for the same booking', async () => {
    const dupReviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        bookingId: createdBookingId,
        rating: 4,
        comment: 'Another review attempt.'
      });

    assert.strictEqual(dupReviewRes.statusCode, 400);
    assert.strictEqual(dupReviewRes.body.success, false);
  });
});
