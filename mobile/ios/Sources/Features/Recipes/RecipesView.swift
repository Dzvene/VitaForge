import SwiftUI

struct RecipesView: View {
    @State private var recipes: [RecipeOut] = []
    @State private var loading = true
    @State private var error: String?
    @State private var toLog: RecipeOut?

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView()
                } else if recipes.isEmpty {
                    ContentUnavailableViewCompat(
                        title: "No recipes yet",
                        message: "Create recipes on the web app, then log them here in one tap."
                    )
                } else {
                    List {
                        ForEach(recipes) { recipe in
                            Button { toLog = recipe } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(recipe.name).foregroundStyle(.primary).font(.subheadline.weight(.medium))
                                    Text("\(Int(recipe.totals.kcal.rounded())) kcal · \(recipe.components.count) items")
                                        .font(.caption).foregroundStyle(Color.inkMuted)
                                }
                            }
                            .swipeActions {
                                Button(role: .destructive) {
                                    Task { await delete(recipe.id) }
                                } label: { Label("Delete", systemImage: "trash") }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Recipes")
            .task { await load() }
            .confirmationDialog(
                toLog?.name ?? "",
                isPresented: Binding(get: { toLog != nil }, set: { if !$0 { toLog = nil } }),
                titleVisibility: .visible
            ) {
                ForEach(Meal.allCases) { meal in
                    Button(mealLabel(meal)) { Task { await log(meal) } }
                }
                Button("Cancel", role: .cancel) {}
            } message: { Text("Log this recipe to today's…") }
            .alert("Couldn't complete", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(error ?? "") }
        }
    }

    private func mealLabel(_ meal: Meal) -> String {
        switch meal {
        case .breakfast: return "Breakfast"
        case .lunch: return "Lunch"
        case .dinner: return "Dinner"
        case .snack: return "Snack"
        }
    }

    private func load() async {
        loading = true
        do { recipes = try await API.recipes() }
        catch { self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        loading = false
    }

    private func log(_ meal: Meal) async {
        guard let recipe = toLog else { return }
        toLog = nil
        do { try await API.logRecipe(recipe.id, RecipeLogIn(entryDate: DateUtil.today(), meal: meal)) }
        catch { self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
    }

    private func delete(_ id: Int) async {
        do {
            try await API.deleteRecipe(id)
            await load()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
