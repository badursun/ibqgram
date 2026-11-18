// Local WebKit development host; Telegram account services live in the C++ fork.
import Cocoa
import WebKit

final class RetroWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class Surface {
    let window: RetroWindow
    let view: WKWebView
    let kind: String
    let contactID: String
    var dragOrigin: NSPoint?
    var dragPointer: NSPoint?
    init(window: RetroWindow, view: WKWebView, kind: String, contactID: String) {
        self.window = window; self.view = view; self.kind = kind; self.contactID = contactID
    }
}

final class PreviewDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler, NSWindowDelegate {
    var surfaces: [String: Surface] = [:]
    var nativeLaunchObserver: NSObjectProtocol?
    let inspectContacts = Bundle.main.object(forInfoDictionaryKey: "ICQRAMInspectContacts") as? Bool == true
    var resources: URL { Bundle.main.resourceURL! }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if yieldToNative() { return }
        nativeLaunchObserver = NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didLaunchApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            _ = self?.yieldToNative()
        }
        NSApp.setActivationPolicy(.regular)
        let menu = NSMenu()
        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Quit IBQgram", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu; menu.addItem(appItem)
        let editItem = NSMenuItem(title: "Edit", action: nil, keyEquivalent: "")
        let editMenu = NSMenu(title: "Edit")
        for (title, action, key) in [("Undo", "undo:", "z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        editItem.submenu = editMenu; menu.addItem(editItem)
        NSApp.mainMenu = menu
        NSApp.applicationIconImage = NSImage(contentsOf: resources.appendingPathComponent("icqram.icns"))
        openSurface(id: "main", kind: inspectContacts ? "contacts" : "login")
        NSApp.activate(ignoringOtherApps: true)
    }

    @discardableResult
    func yieldToNative() -> Bool {
        for identifier in ["app.icqram.desktop.debug", "app.icqram.desktop"] {
            if let native = NSRunningApplication.runningApplications(withBundleIdentifier: identifier).first {
                native.activate(options: [.activateAllWindows])
                NSApp.terminate(nil)
                return true
            }
        }
        return false
    }

    func openSurface(id: String, kind: String, contactID: String = "") {
        if let surface = surfaces[id] {
            surface.window.deminiaturize(nil)
            surface.window.makeKeyAndOrderFront(nil)
            return
        }
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "icqram")
        let context: [String: Any] = ["kind": kind, "contactId": contactID, "fixtures": inspectContacts]
        let json = String(data: try! JSONSerialization.data(withJSONObject: context), encoding: .utf8)!
        config.userContentController.addUserScript(WKUserScript(source: """
            Object.defineProperty(window, 'icqramView', { value: Object.freeze(\(json)) });
            Object.defineProperty(window, 'icqramHost', { value: Object.freeze({
                postMessage: value => window.webkit.messageHandlers.icqram.postMessage(value)
            }) });
            """, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = self
        view.setValue(false, forKey: "drawsBackground")
        let width: CGFloat = kind == "contacts" ? 236 : (kind == "chat" ? 600 : 320)
        let window = RetroWindow(contentRect: NSRect(x: 0, y: 0, width: width, height: kind == "chat" ? 440 : 370), styleMask: [.borderless, .miniaturizable], backing: .buffered, defer: false)
        window.title = kind == "chat" ? "IBQgram — Message" : "IBQgram"
        window.isOpaque = false; window.backgroundColor = .clear
        window.hasShadow = true; window.isReleasedWhenClosed = false
        window.delegate = self; window.contentView = view
        window.center()
        if kind == "chat", let main = surfaces["main"]?.window {
            let bounds = main.screen?.visibleFrame ?? NSScreen.main!.visibleFrame
            let offset = CGFloat(surfaces.count - 1) * 24
            window.setFrameOrigin(NSPoint(x: min(bounds.maxX - width, main.frame.maxX + 24 + offset), y: max(bounds.minY, main.frame.maxY - 410 - offset)))
        }
        surfaces[id] = Surface(window: window, view: view, kind: kind, contactID: contactID)
        view.loadFileURL(resources.appendingPathComponent("index.html"), allowingReadAccessTo: resources)
        window.makeKeyAndOrderFront(nil)
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              let url = message.frameInfo.request.url, url.isFileURL,
              url.standardizedFileURL.path == resources.standardizedFileURL.path + "/index.html",
              let surface = surfaces.values.first(where: { $0.view === message.webView }),
              let text = message.body as? String, text.utf8.count < 65536,
              let bytes = text.data(using: .utf8),
              let body = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
              body["version"] as? Int == 1,
              let id = body["id"] as? Int, id > 0,
              let method = body["method"] as? String else { return }
        let params = body["params"] as? [String: Any] ?? [:]
        var reply: [String: Any] = ["version": 1, "id": id]
        var result: [String: Any] = ["ok": true]
        switch method {
        case "bootstrap":
            result = ["auth": inspectContacts ? "ready" : "phone", "connected": false]
        case "window.resize":
            if let width = params["width"] as? Double, let height = params["height"] as? Double,
               width.isFinite, height.isFinite, width >= 200, width <= 900, height >= 100, height <= 1000 {
                var frame = surface.window.frame
                frame.origin.y += frame.height - height
                frame.size = NSSize(width: width, height: height)
                surface.window.setFrame(frame, display: true)
            }
        case "window.openChat":
            if surface.kind == "contacts", let contact = params["contactId"] as? String,
               !contact.isEmpty, contact.count < 128 {
                openSurface(id: "chat:" + contact, kind: "chat", contactID: contact)
            }
        case "window.minimize":
            surface.window.miniaturize(nil)
        case "window.close":
            if surface.kind == "login" { NSApp.terminate(nil) }
            else { surface.window.orderOut(nil) }
        case "window.dragStart":
            if let x = params["x"] as? Double, let y = params["y"] as? Double, x.isFinite, y.isFinite {
                surface.dragOrigin = surface.window.frame.origin
                surface.dragPointer = NSPoint(x: x, y: y)
            }
        case "window.dragMove":
            if let origin = surface.dragOrigin, let pointer = surface.dragPointer,
               let x = params["x"] as? Double, let y = params["y"] as? Double, x.isFinite, y.isFinite {
                surface.window.setFrameOrigin(NSPoint(x: origin.x + x - pointer.x, y: origin.y - y + pointer.y))
            }
        case "window.dragEnd":
            surface.dragOrigin = nil; surface.dragPointer = nil
        default:
            reply["error"] = "CONNECTION_UNAVAILABLE"
        }
        if reply["error"] == nil { reply["result"] = result }
        guard let data = try? JSONSerialization.data(withJSONObject: reply),
              let json = String(data: data, encoding: .utf8) else { return }
        surface.view.evaluateJavaScript("window.icqramReceive(\(json))", completionHandler: nil)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, url.isFileURL,
              ["index.html", "brand.html"].contains(url.lastPathComponent),
              url.deletingLastPathComponent().standardizedFileURL.path == resources.standardizedFileURL.path else {
            decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil); return false
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        surfaces["main"]?.window.deminiaturize(nil)
        surfaces["main"]?.window.makeKeyAndOrderFront(nil)
        return true
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}

let application = NSApplication.shared
let delegate = PreviewDelegate()
application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
