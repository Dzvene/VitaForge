import SwiftUI

/// Brand palette — light-first, blue-steel brand + teal accent (mirrors the web
/// design system, not a clone of any other app). Uses asset-free dynamic colors.
extension Color {
    static let brand = Color(red: 0.16, green: 0.40, blue: 0.92)      // #2966EB-ish
    static let brandSoft = Color(red: 0.16, green: 0.40, blue: 0.92).opacity(0.12)
    static let accentTeal = Color(red: 0.0, green: 0.65, blue: 0.62)

    static let proteinColor = Color(red: 0.20, green: 0.52, blue: 0.96)
    static let fatColor = Color(red: 0.95, green: 0.62, blue: 0.20)
    static let carbColor = Color(red: 0.30, green: 0.72, blue: 0.50)

    static let cardBg = Color(uiColor: .secondarySystemGroupedBackground)
    static let screenBg = Color(uiColor: .systemGroupedBackground)
    static let inkMuted = Color(uiColor: .secondaryLabel)
}

/// Card container used across screens.
struct CardView<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Color.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

/// A labelled macro progress bar (eaten vs target).
struct MacroBar: View {
    let label: String
    let eaten: Double
    let target: Double
    let tint: Color

    private var fraction: Double {
        guard target > 0 else { return 0 }
        return min(1.0, eaten / target)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(.subheadline.weight(.medium))
                Spacer()
                Text("\(Int(eaten.rounded())) / \(Int(target.rounded())) g")
                    .font(.caption).foregroundStyle(Color.inkMuted)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(tint.opacity(0.18))
                    Capsule().fill(tint).frame(width: geo.size.width * fraction)
                }
            }
            .frame(height: 8)
        }
    }
}

/// Calorie ring — remaining calories in the centre.
struct CalorieRing: View {
    let eaten: Double
    let target: Double

    private var fraction: Double {
        guard target > 0 else { return 0 }
        return min(1.0, eaten / target)
    }
    private var remaining: Int { Int((target - eaten).rounded()) }

    var body: some View {
        ZStack {
            Circle().stroke(Color.brandSoft, lineWidth: 14)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(Color.brand, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(remaining)").font(.system(size: 34, weight: .bold, design: .rounded))
                Text("kcal left").font(.caption).foregroundStyle(Color.inkMuted)
            }
        }
        .frame(width: 150, height: 150)
        .animation(.easeOut, value: fraction)
    }
}
