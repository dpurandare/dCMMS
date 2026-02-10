#!/bin/bash

# CSRF protection batch application script
# This script adds CSRF middleware import and applies it to state-changing routes

ROUTES_DIR="/home/deepak/Public/dCMMS/backend/src/routes"

# List of route files to process (excluding already done: auth, work-orders, assets, users, sites, notifications, reports)
FILES=(
  "permits.ts"
  "webhooks.ts"
  "integrations.ts"
  "attachments.ts"
  "telemetry.ts"
  "dashboards.ts"
  "analytics.ts"
  "analytics-admin.ts"
  "cost-analytics.ts"
  "cost-calculation.ts"
  "budget-management.ts"
  "ml-deployment.ts"
  "ml-features.ts"
  "ml-inference.ts"
  "model-performance.ts"
  "model-governance.ts"
  "ml-explainability.ts"
  "forecasts.ts"
  "predictive-wo.ts"
  "wo-approval.ts"
  "compliance-reports.ts"
  "compliance-templates.ts"
  "alarms.ts"
  "notification-history.ts"
  "genai.routes.ts"
  "slack.ts"
  "audit-logs.ts"
)

echo "CSRF Protection Batch Application"
echo "=================================="
echo ""

for file in "${FILES[@]}"; do
  filepath="$ROUTES_DIR/$file"
  
  if [ ! -f "$filepath" ]; then
    echo "⏭️  Skipping $file (not found)"
    continue
  fi
  
  # Check if file already has CSRF protection
  if grep -q "csrfProtection" "$filepath"; then
    echo "✅ $file (already protected)"
    continue
  fi
  
  # Check if file has  POST, PUT, PATCH, or DELETE routes
  if ! grep -E "\.post\(|\.put\(|\.patch\(|\.delete\(" "$filepath" > /dev/null; then
    echo "⏭️  $file (no state-changing routes)"
    continue
  fi
  
  echo "🔧 Processing $file..."
  
  # Create backup
  cp "$filepath" "$filepath.bak"
  
  # Add CSRF import after other imports (look for common patterns)
  if grep -q "FastifyPluginAsync\|FastifyInstance" "$filepath"; then
    # Find a good insertion point (after imports, before route definitions)
    # This is a simplified approach - adds after the authenticate line or start of function
    
    # Try to add after 'const authenticate' or 'fastify.setValidatorCompiler'
    if grep -q "const authenticate" "$filepath"; then
      sed -i '/const authenticate.*=.*/a\  \n  // Import CSRF protection\n  const { csrfProtection } = await import('\''../middleware/csrf'\'');' "$filepath"
    elif grep -q "fastify.setValidatorCompiler" "$filepath"; then
      sed -i '/fastify.setValidatorCompiler/a\  \n  // Import CSRF protection\n  const { csrfProtection } = await import('\''../middleware/csrf'\'');' "$filepath"
    else
      # Add at the beginning of the async function
      sed -i '/export.*async function\|export default async/a\  // Import CSRF protection\n  const { csrfProtection } = await import('\''../middleware/csrf'\'');' "$filepath"
    fi
    
    echo "   ✓ Added CSRF import"
  fi
  
  echo "   ℹ️  Manual review needed for preHandler updates"
  echo ""
done

echo ""
echo "Summary:"
echo "========"
echo "Processed ${#FILES[@]} files"
echo "⚠️  IMPORTANT: Manual review required to add csrfProtection to preHandler arrays"
echo ""
echo "Pattern to apply:"
echo "  preHandler: [authenticate, csrfProtection, ...otherMiddleware]"
echo ""
echo "Backup files created with .bak extension"
