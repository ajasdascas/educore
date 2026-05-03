param(
  [string]$ApiBase = "https://educore-educore-mysql-staging.up.railway.app"
)

$ErrorActionPreference = "Stop"

function Convert-SecureStringToPlainText {
  param([Parameter(Mandatory = $true)][Security.SecureString]$SecureString)
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Add-Result {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Status,
    [string]$Detail = ""
  )
  $script:Results += [pscustomobject]@{
    name = $Name
    status = $Status
    detail = $Detail
  }
  Write-Host ("[{0}] {1} {2}" -f $Status, $Name, $Detail)
}

function Invoke-Json {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$Token = "",
    [object]$Body = $null
  )

  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  $uri = "$ApiBase$Path"
  $jsonBody = $null
  if ($null -ne $Body) {
    $jsonBody = $Body | ConvertTo-Json -Depth 20 -Compress
  }

  try {
    $response = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -Body $jsonBody -ContentType "application/json" -UseBasicParsing
    $parsed = $null
    if ($response.Content) {
      $parsed = $response.Content | ConvertFrom-Json
    }
    return [pscustomobject]@{ ok = $true; status = [int]$response.StatusCode; body = $parsed; raw = $response.Content }
  } catch {
    $status = 0
    $raw = $_.Exception.Message
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $raw = $reader.ReadToEnd()
      } catch {}
    }
    $parsed = $null
    try { $parsed = $raw | ConvertFrom-Json } catch {}
    return [pscustomobject]@{ ok = $false; status = $status; body = $parsed; raw = $raw }
  }
}

function Login {
  param(
    [Parameter(Mandatory = $true)][string]$Email,
    [Parameter(Mandatory = $true)][string]$Password,
    [Parameter(Mandatory = $true)][string]$Role,
    [string]$TenantID = ""
  )
  $body = @{ email = $Email; password = $Password; role = $Role }
  if ($TenantID) {
    $body.tenant_id = $TenantID
  }
  $result = Invoke-Json -Method "POST" -Path "/api/v1/auth/login" -Body $body
  if (-not $result.ok -or -not $result.body.data.access_token) {
    throw "Login failed for $Email as $Role. HTTP $($result.status): $($result.raw)"
  }
  return $result.body.data
}

function Write-SmokeReport {
  $summary = [pscustomobject]@{
    api = $ApiBase
    generated_at = (Get-Date).ToString("o")
    tenant_id = $tenantID
    school_slug = $schoolSlug
    school_admin_email = $schoolAdminEmail
    teacher_email = $teacherEmail
    parent_email = $parentEmail
    student_id = $studentID
    group_id = $groupID
    payment_id = $paymentID
    results = $script:Results
  }

  $reportPath = Join-Path (Get-Location) "scripts\\staging-smoke-report.json"
  $summary | ConvertTo-Json -Depth 20 | Set-Content -Path $reportPath -Encoding UTF8
  Write-Host ""
  Write-Host "Reporte guardado sin tokens ni passwords: $reportPath"
}

$script:Results = @()
$stamp = Get-Date -Format "yyyyMMddHHmmss"
do {
  $ownerEmail = Read-Host "Owner email [Enter = gioescudero2007@gmail.com]"
  if ([string]::IsNullOrWhiteSpace($ownerEmail)) {
    $ownerEmail = "gioescudero2007@gmail.com"
  }
  $ownerEmail = $ownerEmail.Trim()
  if ($ownerEmail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    Write-Host "Correo invalido. Escribe solo el correo, por ejemplo gioescudero2007@gmail.com, o presiona Enter." -ForegroundColor Yellow
    $ownerEmail = ""
  }
} while ([string]::IsNullOrWhiteSpace($ownerEmail))
$ownerPasswordSecure = Read-Host "Owner password (no se guarda ni se imprime)" -AsSecureString
$schoolAdminPasswordSecure = Read-Host "Password temporal School Admin / Teacher / Parent en staging" -AsSecureString
$ownerPassword = Convert-SecureStringToPlainText $ownerPasswordSecure
$schoolAdminPassword = Convert-SecureStringToPlainText $schoolAdminPasswordSecure

$ownerToken = $null
$schoolAdminToken = $null
$parentToken = $null
$teacherToken = $null
$tenantID = ""
$schoolAdminEmail = "admin-staging-$stamp@educore.mx"
$teacherEmail = "teacher-staging-$stamp@educore.mx"
$parentEmail = "parent-staging-$stamp@educore.mx"
$schoolSlug = "staging-mysql-$stamp"
$studentID = ""
$groupID = ""
$teacherID = ""
$paymentID = ""

try {
  $health = Invoke-Json -Method "GET" -Path "/api/v1/health"
  if ($health.ok -and $health.body.data.db_driver -eq "mysql" -and $health.body.data.env -eq "staging") {
    Add-Result "health mysql staging" "PASS" "db_driver=mysql env=staging"
  } else {
    Add-Result "health mysql staging" "FAIL" $health.raw
    throw "Health failed"
  }

  try {
    $owner = Login -Email $ownerEmail -Password $ownerPassword -Role "SUPER_ADMIN"
    $ownerToken = $owner.access_token
    Add-Result "login owner super admin" "PASS" $owner.user.email
  } catch {
    Add-Result "login owner super admin" "FAIL" "HTTP 401 o credenciales/seed no coinciden"
    throw "No se pudo iniciar sesion como owner. Revisa que el correo sea correcto, que el ultimo deploy este verde y que Railway tenga EDUCORE_OWNER_ADMIN_PASSWORD configurado."
  }

  $stats = Invoke-Json -Method "GET" -Path "/api/v1/super-admin/stats" -Token $ownerToken
  Add-Result "super admin stats" ($(if ($stats.ok) { "PASS" } else { "FAIL" })) "HTTP $($stats.status)"

  $tables = Invoke-Json -Method "GET" -Path "/api/v1/super-admin/database/tables" -Token $ownerToken
  Add-Result "database tables" ($(if ($tables.ok) { "PASS" } else { "FAIL" })) "HTTP $($tables.status)"

  $schoolBody = @{
    name = "Escuela Staging MySQL $stamp"
    logo_url = ""
    levels = @("primaria")
    phone = "7770000000"
    contact_email = "contacto-$stamp@educore.mx"
    address = "Staging Railway Hostinger MySQL"
    slug = $schoolSlug
    timezone = "America/Mexico_City"
    admin_email = $schoolAdminEmail
    admin_name = "Admin Staging MySQL"
    plan = "Basic"
    premium_modules = @("payments")
    rfc = "XAXX010101000"
    razon_social = "Escuela Staging MySQL"
    regimen = "General"
    codigo_postal = "62550"
    school_year = "2026-2027"
    eval_scheme = "numeric"
  }
  $createdSchool = Invoke-Json -Method "POST" -Path "/api/v1/super-admin/schools" -Token $ownerToken -Body $schoolBody
  if ($createdSchool.ok) {
    $tenantID = $createdSchool.body.data.tenant_id
    Add-Result "crear escuela staging" "PASS" $tenantID
  } else {
    Add-Result "crear escuela staging" "FAIL" $createdSchool.raw
    throw "Create school failed"
  }

  $editTrial = Invoke-Json -Method "PATCH" -Path "/api/v1/super-admin/schools/$tenantID/status" -Token $ownerToken -Body @{ status = "trial" }
  $editActive = Invoke-Json -Method "PATCH" -Path "/api/v1/super-admin/schools/$tenantID/status" -Token $ownerToken -Body @{ status = "active" }
  Add-Result "editar escuela staging" ($(if ($editTrial.ok -and $editActive.ok) { "PASS" } else { "FAIL" })) "trial->active"

  $listed = Invoke-Json -Method "GET" -Path "/api/v1/super-admin/schools?search=$schoolSlug" -Token $ownerToken
  $listedText = $listed.raw
  if ($listed.ok -and $listedText -like "*$schoolSlug*") {
    Add-Result "persistencia escuela listado" "PASS" $schoolSlug
  } else {
    Add-Result "persistencia escuela listado" "FAIL" "No aparecio en listado"
  }

  $schoolAdmin = Login -Email $schoolAdminEmail -Password $schoolAdminPassword -Role "SCHOOL_ADMIN" -TenantID $tenantID
  $schoolAdminToken = $schoolAdmin.access_token
  Add-Result "login school admin" "PASS" $schoolAdminEmail

  $saDashboard = Invoke-Json -Method "GET" -Path "/api/v1/school-admin/dashboard" -Token $schoolAdminToken
  Add-Result "school admin dashboard" ($(if ($saDashboard.ok) { "PASS" } else { "FAIL" })) "HTTP $($saDashboard.status)"

  $years = Invoke-Json -Method "GET" -Path "/api/v1/school-admin/academic/school-years" -Token $schoolAdminToken
  Add-Result "school years" ($(if ($years.ok) { "PASS" } else { "FAIL" })) "HTTP $($years.status)"

  $groups = Invoke-Json -Method "GET" -Path "/api/v1/school-admin/academic/groups" -Token $schoolAdminToken
  if ($groups.ok -and $groups.raw -match '"id"') {
    $groupID = $groups.body.data[0].id
    Add-Result "grupo base disponible" "PASS" $groupID
  } else {
    Add-Result "grupo base disponible" "WARN" "No se pudo obtener grupo base"
  }

  $teacher = Invoke-Json -Method "POST" -Path "/api/v1/school-admin/academic/teachers" -Token $schoolAdminToken -Body @{
    first_name = "Teacher"
    last_name = "Staging"
    email = $teacherEmail
    phone = "7771112233"
    address = "Staging"
    specialties = @("Primaria")
    employee_id = "EMP-$stamp"
    hire_date = "2026-05-03"
    salary = 0
    status = "active"
  }
  if ($teacher.ok) {
    $teacherID = $teacher.body.data.id
    Add-Result "crear teacher" "PASS" $teacherID
  } else {
    Add-Result "crear teacher" "FAIL" $teacher.raw
  }

  if ($groupID) {
    $student = Invoke-Json -Method "POST" -Path "/api/v1/school-admin/academic/students" -Token $schoolAdminToken -Body @{
      first_name = "Alumno"
      paternal_last_name = "Staging"
      maternal_last_name = "MySQL"
      last_name = "Staging MySQL"
      birth_date = "2018-05-03"
      birth_day = "03"
      birth_month = "05"
      birth_year = "2018"
      address = "Staging"
      group_id = $groupID
      enrollment_id = "STU-$stamp"
      status = "active"
      parents = @(@{
        first_name = "Parent"
        paternal_last_name = "Staging"
        maternal_last_name = "MySQL"
        email = $parentEmail
        phone = "7772223344"
        relationship = "guardian"
        is_primary = $true
        notes = "Smoke staging"
      })
    }
    if ($student.ok) {
      $studentID = $student.body.data.id
      Add-Result "crear alumno" "PASS" $studentID
    } else {
      Add-Result "crear alumno" "FAIL" $student.raw
    }
  }

  if ($groupID -and $studentID) {
    $attendance = Invoke-Json -Method "POST" -Path "/api/v1/school-admin/attendance/groups/$groupID/bulk" -Token $schoolAdminToken -Body @{
      date = (Get-Date -Format "yyyy-MM-dd")
      records = @(@{ student_id = $studentID; status = "present"; notes = "Smoke staging" })
    }
    Add-Result "asistencia bulk" ($(if ($attendance.ok) { "PASS" } else { "FAIL" })) "HTTP $($attendance.status)"

    $charge = Invoke-Json -Method "POST" -Path "/api/v1/school-admin/payments/charges" -Token $schoolAdminToken -Body @{
      student_id = $studentID
      concept = "colegiatura"
      description = "Smoke staging"
      amount = 10
      currency = "MXN"
      due_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
      notes = "Smoke staging"
    }
    if ($charge.ok) {
      $paymentID = $charge.body.data.id
      Add-Result "crear cargo" "PASS" $paymentID
      $paid = Invoke-Json -Method "POST" -Path "/api/v1/school-admin/payments/$paymentID/record-payment" -Token $schoolAdminToken -Body @{
        method = "cash"
        amount = 10
        reference = "SMOKE-$stamp"
        notes = "Smoke staging cash"
      }
      Add-Result "registrar pago cash" ($(if ($paid.ok) { "PASS" } else { "FAIL" })) "HTTP $($paid.status)"
      $receipt = Invoke-Json -Method "GET" -Path "/api/v1/school-admin/payments/$paymentID/receipt" -Token $schoolAdminToken
      Add-Result "recibo pago" ($(if ($receipt.ok) { "PASS" } else { "FAIL" })) "HTTP $($receipt.status)"
    } else {
      Add-Result "crear cargo" "FAIL" $charge.raw
    }
  }

  if ($parentEmail -and $studentID) {
    try {
      $parent = Login -Email $parentEmail -Password $schoolAdminPassword -Role "PARENT" -TenantID $tenantID
      $parentToken = $parent.access_token
      Add-Result "login parent" "PASS" $parentEmail
      $parentDashboard = Invoke-Json -Method "GET" -Path "/api/v1/parent/dashboard" -Token $parentToken
      Add-Result "parent dashboard" ($(if ($parentDashboard.ok) { "PASS" } else { "FAIL" })) "HTTP $($parentDashboard.status)"
      $parentPayments = Invoke-Json -Method "GET" -Path "/api/v1/parent/payments" -Token $parentToken
      Add-Result "parent payments" ($(if ($parentPayments.ok) { "PASS" } else { "FAIL" })) "HTTP $($parentPayments.status)"
      $parentSchoolAdmin = Invoke-Json -Method "GET" -Path "/api/v1/school-admin/dashboard" -Token $parentToken
      Add-Result "rbac parent school-admin bloqueado" ($(if ($parentSchoolAdmin.status -eq 403) { "PASS" } else { "FAIL" })) "HTTP $($parentSchoolAdmin.status)"
      $parentSuper = Invoke-Json -Method "GET" -Path "/api/v1/super-admin/stats" -Token $parentToken
      Add-Result "rbac parent super-admin bloqueado" ($(if ($parentSuper.status -eq 403) { "PASS" } else { "FAIL" })) "HTTP $($parentSuper.status)"
    } catch {
      Add-Result "parent login/dashboard" "FAIL" $_.Exception.Message
    }
  }

  if ($teacherEmail) {
    try {
      $teacherLogin = Login -Email $teacherEmail -Password $schoolAdminPassword -Role "TEACHER" -TenantID $tenantID
      $teacherToken = $teacherLogin.access_token
      Add-Result "login teacher" "PASS" $teacherEmail
      $teacherDashboard = Invoke-Json -Method "GET" -Path "/api/v1/teacher/dashboard" -Token $teacherToken
      Add-Result "teacher dashboard" ($(if ($teacherDashboard.ok) { "PASS" } else { "FAIL" })) "HTTP $($teacherDashboard.status)"
      $teacherSuper = Invoke-Json -Method "GET" -Path "/api/v1/super-admin/stats" -Token $teacherToken
      Add-Result "rbac teacher super-admin bloqueado" ($(if ($teacherSuper.status -eq 403) { "PASS" } else { "FAIL" })) "HTTP $($teacherSuper.status)"
    } catch {
      Add-Result "teacher login/dashboard" "FAIL" $_.Exception.Message
    }
  }

  $schoolAdminSuper = Invoke-Json -Method "GET" -Path "/api/v1/super-admin/stats" -Token $schoolAdminToken
  Add-Result "rbac school-admin super-admin bloqueado" ($(if ($schoolAdminSuper.status -eq 403) { "PASS" } else { "FAIL" })) "HTTP $($schoolAdminSuper.status)"
} finally {
  $ownerPassword = $null
  $schoolAdminPassword = $null
  Write-SmokeReport
}
