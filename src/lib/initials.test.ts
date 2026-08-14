import { initials } from './initials'

test('một chữ lấy chữ cái đầu', () => {
  expect(initials('Hùng')).toBe('H')
})

test('nhiều chữ lấy chữ đầu của từ đầu và từ cuối', () => {
  expect(initials('Đức Anh')).toBe('ĐA')
  expect(initials('Nguyễn Văn An')).toBe('NA')
})

test('viết hoa kể cả khi nhập chữ thường, giữ dấu tiếng Việt', () => {
  expect(initials('mai anh')).toBe('MA')
  expect(initials('đông')).toBe('Đ')
})

test('bỏ qua khoảng trắng thừa', () => {
  expect(initials('  Đức   Anh  ')).toBe('ĐA')
})

test('tên rỗng trả về dấu hỏi thay vì chuỗi rỗng — avatar luôn có nội dung', () => {
  expect(initials('')).toBe('?')
  expect(initials('   ')).toBe('?')
})
