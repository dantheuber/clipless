export const ip = '(?<ip>(\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5]))';
export const email = '(?<email>([a-zA-Z0-9_\\-\\.]+)@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.)|(([a-zA-Z0-9\\-]+\\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\\]?))';
export const url = '(?<url>(http|ftp|https|ws|wss|file):\\/\\/[\\w\\-_]+(\.[\\w\\-_]+)+([\\w\\-\\.,@?^=%&amp;:/~\\+#]*[\\w\\-\\@?^=%&amp;/~\\+#]))';
export const guid = '(?<guid>[A-Fa-f\\d]{8}-[A-Fa-f\\d]{4}-[A-Fa-f0\\d]{4}-[A-Fa-f\\d]{4}-[A-Fa-f\\d]{12})';
export const phoneNumber = '(?<phoneNumber>(\\+{0,1}\\d{1,3}-){0,1}[2-9]\\d{2}-\\d{3}-\\d{4})';

export const list = [{
  label: 'IP Address',
  regex: ip,
  example: '192.168.1.100'
}, {
  label: 'E-Mail Address',
  regex: email,
  example: 'example@example.com'
}, {
  label: 'URL',
  regex: url,
  example: 'http://example.com/some/path/'
}, {
  label: 'GUID',
  regex: guid,
  example: '3dee6d05-d520-4d0b-9128-294c84c36dce'
}, {
  label: 'Phone Number',
  regex: phoneNumber,
  example: '+1-555-212-0000'
}];