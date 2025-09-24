/**
 * Admin Quality-of-Life Features
 * Health checks, duplicate detection, role auditing, and system monitoring
 */
const { EventService } = require('../src/services/eventService');
const twilio = require('twilio');
const { Resend } = require('resend');

/**
 * Check email service health
 */
async function checkEmailHealth() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Test email send capability
    const testResult = await resend.emails.send({
      from: 'Wine & Grind Health Check <noreply@wineandgrind.com>',
      to: process.env.ADMIN_EMAIL || 'admin@wineandgrind.com',
      subject: '✅ Email Service Health Check',
      text: 'Email service is working correctly.',
      tags: [{ name: 'type', value: 'health-check' }]
    });
    
    return {
      service: 'Email (Resend)',
      status: 'healthy',
      details: 'Test email sent successfully',
      messageId: testResult.id
    };
    
  } catch (error) {
    return {
      service: 'Email (Resend)',
      status: 'unhealthy',
      error: error.message,
      fix: 'Check RESEND_API_KEY environment variable'
    };
  }
}

/**
 * Check SMS service health  
 */
async function checkSMSHealth() {
  try {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return {
        service: 'SMS (Twilio)',
        status: 'not-configured',
        error: 'Twilio credentials not found',
        fix: 'Set TWILIO_SID and TWILIO_AUTH_TOKEN environment variables'
      };
    }
    
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Test by getting account info
    const account = await client.api.accounts(process.env.TWILIO_SID).fetch();
    
    return {
      service: 'SMS (Twilio)',
      status: 'healthy', 
      details: `Account status: ${account.status}`,
      accountSid: account.sid
    };
    
  } catch (error) {
    return {
      service: 'SMS (Twilio)',
      status: 'unhealthy',
      error: error.message,
      fix: 'Check Twilio credentials and account status'
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabaseHealth() {
  try {
    // Test by fetching events
    const events = await EventService.getAllEvents();
    
    return {
      service: 'Database (Firebase)',
      status: 'healthy',
      details: `Successfully fetched ${events.length} events`,
      recordCount: events.length
    };
    
  } catch (error) {
    return {
      service: 'Database (Firebase)', 
      status: 'unhealthy',
      error: error.message,
      fix: 'Check Firebase configuration and permissions'
    };
  }
}

/**
 * Check for duplicate registrations
 */
async function detectDuplicateRegistrations(eventId) {
  try {
    const registrations = await EventService.getEventRegistrations(eventId);
    
    // Group by email to find duplicates
    const emailGroups = {};
    const phoneGroups = {};
    const duplicates = [];
    
    registrations.forEach(reg => {
      // Check email duplicates
      if (reg.email) {
        const email = reg.email.toLowerCase().trim();
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(reg);
      }
      
      // Check phone duplicates
      if (reg.phone) {
        const phone = reg.phone.replace(/\D/g, ''); // Remove non-digits
        if (!phoneGroups[phone]) {
          phoneGroups[phone] = [];
        }
        phoneGroups[phone].push(reg);
      }
    });
    
    // Find email duplicates
    Object.entries(emailGroups).forEach(([email, regs]) => {
      if (regs.length > 1) {
        duplicates.push({
          type: 'email',
          value: email,
          registrations: regs.map(r => ({
            id: r.id,
            name: r.name,
            registeredAt: r.createdAt,
            status: r.status
          })),
          count: regs.length,
          recommendedAction: 'merge-or-remove'
        });
      }
    });
    
    // Find phone duplicates
    Object.entries(phoneGroups).forEach(([phone, regs]) => {
      if (regs.length > 1) {
        duplicates.push({
          type: 'phone',
          value: phone,
          registrations: regs.map(r => ({
            id: r.id,
            name: r.name,
            email: r.email,
            registeredAt: r.createdAt,
            status: r.status
          })),
          count: regs.length,
          recommendedAction: 'verify-different-people'
        });
      }
    });
    
    return {
      success: true,
      duplicatesFound: duplicates.length,
      duplicates,
      totalRegistrations: registrations.length
    };
    
  } catch (error) {
    console.error('❌ Error detecting duplicates:', error);
    throw error;
  }
}

/**
 * Audit user roles and permissions
 */
async function auditUserRoles(eventId) {
  try {
    const registrations = await EventService.getEventRegistrations(eventId);
    const event = await EventService.getEventById(eventId);
    const eventSpeakers = event?.speakers || [];
    
    const roleAudit = {
      roles: {},
      inconsistencies: [],
      recommendations: []
    };
    
    registrations.forEach(reg => {
      const roles = [];
      
      // Collect all role indicators
      if (reg.role) roles.push(`role:${reg.role}`);
      if (reg.badgeRole) roles.push(`badge:${reg.badgeRole}`);
      if (reg.ticket_type) roles.push(`ticket:${reg.ticket_type}`);
      if (eventSpeakers.some(s => s.userId === reg.userId)) roles.push('speaker');
      
      const roleKey = roles.length > 0 ? roles.join(', ') : 'no-role';
      
      if (!roleAudit.roles[roleKey]) {
        roleAudit.roles[roleKey] = [];
      }
      
      roleAudit.roles[roleKey].push({
        id: reg.id,
        name: reg.name,
        email: reg.email,
        status: reg.status
      });
      
      // Check for inconsistencies
      if (roles.length > 2) {
        roleAudit.inconsistencies.push({
          userId: reg.userId,
          name: reg.name,
          email: reg.email,
          roles: roles,
          issue: 'multiple-conflicting-roles',
          recommendation: 'Clarify primary role'
        });
      }
      
      if (reg.badgeRole && reg.role && reg.badgeRole !== reg.role) {
        roleAudit.inconsistencies.push({
          userId: reg.userId,
          name: reg.name,
          email: reg.email,
          badgeRole: reg.badgeRole,
          profileRole: reg.role,
          issue: 'badge-profile-role-mismatch',
          recommendation: 'Align badge and profile roles'
        });
      }
    });
    
    // Generate recommendations
    if (roleAudit.inconsistencies.length > 0) {
      roleAudit.recommendations.push(`Found ${roleAudit.inconsistencies.length} role inconsistencies that should be reviewed`);
    }
    
    const noRoleCount = roleAudit.roles['no-role']?.length || 0;
    if (noRoleCount > 0) {
      roleAudit.recommendations.push(`${noRoleCount} users have no assigned role - consider setting default roles`);
    }
    
    return {
      success: true,
      audit: roleAudit,
      totalUsers: registrations.length,
      inconsistencyCount: roleAudit.inconsistencies.length
    };
    
  } catch (error) {
    console.error('❌ Error in role audit:', error);
    throw error;
  }
}

/**
 * Check system resources and performance
 */
async function checkSystemPerformance() {
  const startTime = Date.now();
  
  try {
    // Test database response time
    const dbStart = Date.now();
    await EventService.getAllEvents();
    const dbResponseTime = Date.now() - dbStart;
    
    // Test API response time
    const apiStart = Date.now();
    // Make a test API call to self
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/health`);
    } catch (e) {
      // API might not exist, that's ok for this test
    }
    const apiResponseTime = Date.now() - apiStart;
    
    const totalTime = Date.now() - startTime;
    
    const performance = {
      database: {
        responseTime: `${dbResponseTime}ms`,
        status: dbResponseTime < 1000 ? 'good' : dbResponseTime < 3000 ? 'slow' : 'poor'
      },
      api: {
        responseTime: `${apiResponseTime}ms`,
        status: apiResponseTime < 500 ? 'good' : apiResponseTime < 2000 ? 'slow' : 'poor'
      },
      overall: {
        responseTime: `${totalTime}ms`,
        status: totalTime < 2000 ? 'good' : totalTime < 5000 ? 'slow' : 'poor'
      }
    };
    
    const issues = [];
    if (performance.database.status === 'poor') {
      issues.push('Database response time is poor (>3s)');
    }
    if (performance.api.status === 'poor') {
      issues.push('API response time is poor (>2s)');
    }
    
    return {
      success: true,
      performance,
      issues,
      recommendations: issues.length > 0 ? ['Consider optimizing database queries', 'Check server resources'] : []
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    };
  }
}

/**
 * Run comprehensive health check
 */
async function runHealthCheck(eventId = null) {
  console.log('🔍 Running comprehensive health check...');
  
  const results = {
    timestamp: new Date().toISOString(),
    overall: 'unknown',
    services: [],
    issues: [],
    recommendations: []
  };
  
  try {
    // Service health checks
    const [emailHealth, smsHealth, dbHealth, performance] = await Promise.all([
      checkEmailHealth(),
      checkSMSHealth(),
      checkDatabaseHealth(),
      checkSystemPerformance()
    ]);
    
    results.services = [emailHealth, smsHealth, dbHealth];
    results.performance = performance;
    
    // Event-specific checks if eventId provided
    if (eventId) {
      const [duplicates, roleAudit] = await Promise.all([
        detectDuplicateRegistrations(eventId),
        auditUserRoles(eventId)
      ]);
      
      results.duplicates = duplicates;
      results.roleAudit = roleAudit;
      
      // Add event-specific issues
      if (duplicates.duplicatesFound > 0) {
        results.issues.push(`Found ${duplicates.duplicatesFound} duplicate registrations`);
        results.recommendations.push('Review and merge/remove duplicate registrations');
      }
      
      if (roleAudit.inconsistencyCount > 0) {
        results.issues.push(`Found ${roleAudit.inconsistencyCount} role inconsistencies`);
        results.recommendations.push('Review role assignments for consistency');
      }
    }
    
    // Collect service issues
    results.services.forEach(service => {
      if (service.status === 'unhealthy') {
        results.issues.push(`${service.service}: ${service.error}`);
        if (service.fix) {
          results.recommendations.push(`${service.service}: ${service.fix}`);
        }
      } else if (service.status === 'not-configured') {
        results.issues.push(`${service.service}: Not configured`);
        if (service.fix) {
          results.recommendations.push(service.fix);
        }
      }
    });
    
    // Add performance issues
    if (performance.issues) {
      results.issues.push(...performance.issues);
    }
    if (performance.recommendations) {
      results.recommendations.push(...performance.recommendations);
    }
    
    // Determine overall status
    const hasErrors = results.services.some(s => s.status === 'unhealthy');
    const hasWarnings = results.services.some(s => s.status === 'not-configured') || 
                       results.issues.length > 0;
    
    results.overall = hasErrors ? 'critical' : hasWarnings ? 'warning' : 'healthy';
    
    console.log(`✅ Health check complete - Status: ${results.overall}`);
    return results;
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    results.overall = 'error';
    results.error = error.message;
    return results;
  }
}

// API handler
module.exports = async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    const { eventId } = req.query;
    const healthCheck = await runHealthCheck(eventId);
    
    return res.status(200).json({
      success: true,
      healthCheck
    });
    
  } catch (error) {
    console.error('❌ Health check API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export functions
module.exports.runHealthCheck = runHealthCheck;
module.exports.detectDuplicateRegistrations = detectDuplicateRegistrations;
module.exports.auditUserRoles = auditUserRoles;