import SwiftUI

struct ChatrSearchBar: View {
    @Binding var text: String
    var placeholder: String = "Search anything..."
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.chatrMutedForeground)
            
            TextField(placeholder, text: $text)
                .foregroundColor(.chatrForeground)
                .autocapitalization(.none)
                .disableAutocorrection(true)
            
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.chatrMutedForeground)
                }
            }
        }
        .padding(12)
        .background(Color.chatrCard)
        .cornerRadius(12)
    }
}
