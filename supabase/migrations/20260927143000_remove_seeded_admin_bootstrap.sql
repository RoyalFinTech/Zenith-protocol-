-- Remove the historical seeded administrator bootstrap.
-- Administrator provisioning is an operator-controlled step and must not be performed by migrations.
-- Match the original seed hash as well as the email so an independently provisioned account is untouched.

delete from public.admin_users
where email='admin@zenitprotocol.com'
  and password_hash='scrypt$597d9e84479adbcd90b109aad93cabdb$824ef600a232af8efdd11a6f696b98d473a86af057dce61c81a6cc5c330217ce53ec9dadd2e1b2bdcbca6fd0b3aec4bb7a34e2c880cad259942bdf697b39e896';
