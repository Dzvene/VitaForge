import SwiftUI

/// Brand palette — ported 1:1 from the web token set (frontend globals.css,
/// `:root` light values). Backgrounds stay on system grouped colors so the app
/// follows light/dark automatically, mirroring the web's theme toggle.
extension Color {
    static let brand = Color(red: 0.169, green: 0.486, blue: 0.941)   // brand-500 #2B7CF0
    static let brandSoft = Color(red: 0.169, green: 0.486, blue: 0.941).opacity(0.12)
    static let accentTeal = Color(red: 0.051, green: 0.647, blue: 0.706) // accent #0DA5B4

    static let proteinColor = Color(red: 0.200, green: 0.478, blue: 0.941) // #337AF0
    static let fatColor = Color(red: 0.776, green: 0.525, blue: 0.043)     // #C6860B
    static let carbColor = Color(red: 0.051, green: 0.635, blue: 0.455)    // #0DA274

    static let cardBg = Color(uiColor: .secondarySystemGroupedBackground)
    static let screenBg = Color(uiColor: .systemGroupedBackground)
    static let inkMuted = Color(uiColor: .secondaryLabel)
}

/// Faint corner glows over the canvas — the brand tint top-right, the accent
/// tint bottom-left — mirroring the web `body` radial-gradient backdrop. Place
/// behind screen content (e.g. in a ZStack at the app root).
struct VFBackground: View {
    var body: some View {
        ZStack {
            Color.screenBg
            GeometryReader { geo in
                Circle()
                    .fill(Color.brand.opacity(0.06))
                    .frame(width: geo.size.width * 1.6)
                    .blur(radius: 120)
                    .position(x: geo.size.width, y: geo.size.height * -0.05)
                Circle()
                    .fill(Color.accentTeal.opacity(0.06))
                    .frame(width: geo.size.width * 1.4)
                    .blur(radius: 120)
                    .position(x: 0, y: geo.size.height * 1.05)
            }
        }
        .ignoresSafeArea()
    }
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
