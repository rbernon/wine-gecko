/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef nsIDocumentObserver_h___
#define nsIDocumentObserver_h___

#include "mozilla/EventStates.h"
#include "mozilla/StyleSheetHandle.h"
#include "nsISupports.h"
#include "nsIMutationObserver.h"

class nsIContent;
class nsIDocument;
class nsIParser;

namespace mozilla {
namespace css {
class Rule;
} // namespace css
} // namespace mozilla

#define NS_IDOCUMENT_OBSERVER_IID \
{ 0x71041fa3, 0x6dd7, 0x4cde, \
  { 0xbb, 0x76, 0xae, 0xcc, 0x69, 0xe1, 0x75, 0x78 } }

typedef uint32_t nsUpdateType;

#define UPDATE_CONTENT_MODEL 0x00000001
#define UPDATE_STYLE         0x00000002
#define UPDATE_ALL (UPDATE_CONTENT_MODEL | UPDATE_STYLE)

// Document observer interface
class nsIDocumentObserver : public nsIMutationObserver
{
public:
  NS_DECLARE_STATIC_IID_ACCESSOR(NS_IDOCUMENT_OBSERVER_IID)

  /**
   * Notify that a content model update is beginning. This call can be
   * nested.
   */
  NS_IMETHOD_(void) BeginUpdate(nsIDocument *aDocument,
                           nsUpdateType aUpdateType) = 0;

  /**
   * Notify that a content model update is finished. This call can be
   * nested.
   */
  NS_IMETHOD_(void) EndUpdate(nsIDocument *aDocument, nsUpdateType aUpdateType) = 0;

  /**
   * Notify the observer that a document load is beginning.
   */
  NS_IMETHOD_(void) BeginLoad(nsIDocument *aDocument) = 0;

  /**
   * Notify the observer that a document load has finished. Note that
   * the associated reflow of the document will be done <b>before</b>
   * EndLoad is invoked, not after.
   */
  NS_IMETHOD_(void) EndLoad(nsIDocument *aDocument) = 0;

  /**
   * Notification that the state of a content node has changed. 
   * (ie: gained or lost focus, became active or hovered over)
   * This method is called automatically by content objects 
   * when their state is changed (therefore there is normally 
   * no need to invoke this method directly).  The notification 
   * is passed to any IDocumentObservers. The notification is 
   * passed on to all of the document observers. <p>
   *
   * This notification is not sent when a piece of content is
   * added/removed from the document or the content itself changed 
   * (the other notifications are used for that).
   *
   * @param aDocument The document being observed
   * @param aContent the piece of content that changed
   */
  NS_IMETHOD_(void) ContentStateChanged(nsIDocument* aDocument,
                                   nsIContent* aContent,
                                   mozilla::EventStates aStateMask) = 0;

  /**
   * Notification that the state of the document has changed.
   *
   * @param aDocument The document being observed
   * @param aStateMask the state that changed
   */
  NS_IMETHOD_(void) DocumentStatesChanged(nsIDocument* aDocument,
                                     mozilla::EventStates aStateMask) = 0;

  /**
   * A StyleSheet has just been added to the document.  This method is
   * called automatically when a StyleSheet gets added to the
   * document, even if the stylesheet is not applicable. The
   * notification is passed on to all of the document observers.
   *
   * @param aStyleSheet the StyleSheet that has been added
   * @param aDocumentSheet True if sheet is in document's style sheet list,
   *                       false if sheet is not (i.e., UA or user sheet)
   */
  NS_IMETHOD_(void) StyleSheetAdded(mozilla::StyleSheetHandle aStyleSheet,
                               bool aDocumentSheet) = 0;

  /**
   * A StyleSheet has just been removed from the document.  This
   * method is called automatically when a StyleSheet gets removed
   * from the document, even if the stylesheet is not applicable. The
   * notification is passed on to all of the document observers.
   *
   * @param aStyleSheet the StyleSheet that has been removed
   * @param aDocumentSheet True if sheet is in document's style sheet list,
   *                       false if sheet is not (i.e., UA or user sheet)
   */
  NS_IMETHOD_(void) StyleSheetRemoved(mozilla::StyleSheetHandle aStyleSheet,
                                 bool aDocumentSheet) = 0;
  
  /**
   * A StyleSheet has just changed its applicable state.
   * This method is called automatically when the applicable state
   * of a StyleSheet gets changed. The style sheet passes this
   * notification to the document. The notification is passed on 
   * to all of the document observers.
   *
   * @param aStyleSheet the StyleSheet that has changed state
   */
  NS_IMETHOD_(void) StyleSheetApplicableStateChanged(mozilla::StyleSheetHandle aStyleSheet) = 0;

  /**
   * A StyleRule has just been modified within a style sheet.
   * This method is called automatically when the rule gets
   * modified. The style sheet passes this notification to 
   * the document. The notification is passed on to all of 
   * the document observers.
   *
   * @param aStyleSheet the StyleSheet that contians the rule
   */
  NS_IMETHOD_(void) StyleRuleChanged(mozilla::StyleSheetHandle aStyleSheet) = 0;

  /**
   * A StyleRule has just been added to a style sheet.
   * This method is called automatically when the rule gets
   * added to the sheet. The style sheet passes this
   * notification to the document. The notification is passed on 
   * to all of the document observers.
   *
   * @param aStyleSheet the StyleSheet that has been modified
   */
  NS_IMETHOD_(void) StyleRuleAdded(mozilla::StyleSheetHandle aStyleSheet) = 0;

  /**
   * A StyleRule has just been removed from a style sheet.
   * This method is called automatically when the rule gets
   * removed from the sheet. The style sheet passes this
   * notification to the document. The notification is passed on 
   * to all of the document observers.
   *
   * @param aStyleSheet the StyleSheet that has been modified
   */
  NS_IMETHOD_(void) StyleRuleRemoved(mozilla::StyleSheetHandle aStyleSheet) = 0;

#ifdef WINE_GECKO_SRC
  /**
   * A node has been bind to the tree
   */
  NS_IMETHOD_(void) BindToDocument(nsIDocument *aDocument,
                              nsIContent *aContent) = 0;

  NS_IMETHOD_(void) AttemptToExecuteScript(nsIContent *aContent, nsIParser *aParser, bool *aBlock) = 0;
#endif
};

NS_DEFINE_STATIC_IID_ACCESSOR(nsIDocumentObserver, NS_IDOCUMENT_OBSERVER_IID)

#define NS_DECL_NSIDOCUMENTOBSERVER_BEGINUPDATE                              \
    NS_IMETHOD_(void) BeginUpdate(nsIDocument* aDocument,                    \
                             nsUpdateType aUpdateType) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_ENDUPDATE                                \
    NS_IMETHOD_(void) EndUpdate(nsIDocument* aDocument, nsUpdateType aUpdateType) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_BEGINLOAD                                \
    NS_IMETHOD_(void) BeginLoad(nsIDocument* aDocument) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_ENDLOAD                                  \
    NS_IMETHOD_(void) EndLoad(nsIDocument* aDocument) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_CONTENTSTATECHANGED                      \
    NS_IMETHOD_(void) ContentStateChanged(nsIDocument* aDocument,            \
                                     nsIContent* aContent,                   \
                                     mozilla::EventStates aStateMask) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_DOCUMENTSTATESCHANGED                    \
    NS_IMETHOD_(void) DocumentStatesChanged(nsIDocument* aDocument,          \
                                       mozilla::EventStates aStateMask) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_STYLESHEETADDED                          \
    NS_IMETHOD_(void) StyleSheetAdded(mozilla::StyleSheetHandle aStyleSheet, \
                                 bool aDocumentSheet) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_STYLESHEETREMOVED                        \
    NS_IMETHOD_(void) StyleSheetRemoved(mozilla::StyleSheetHandle aStyleSheet, \
                                   bool aDocumentSheet) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_STYLESHEETAPPLICABLESTATECHANGED         \
    NS_IMETHOD_(void) StyleSheetApplicableStateChanged(                      \
        mozilla::StyleSheetHandle aStyleSheet) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_STYLERULECHANGED                         \
    NS_IMETHOD_(void) StyleRuleChanged(mozilla::StyleSheetHandle aStyleSheet) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_STYLERULEADDED                           \
    NS_IMETHOD_(void) StyleRuleAdded(mozilla::StyleSheetHandle aStyleSheet) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_STYLERULEREMOVED                         \
    NS_IMETHOD_(void) StyleRuleRemoved(mozilla::StyleSheetHandle aStyleSheet) override;

#ifdef WINE_GECKO_SRC

#define NS_DECL_NSIDOCUMENTOBSERVER_BINDTODOCUMENT                           \
    NS_IMETHOD_(void) BindToDocument(nsIDocument *aDocument,                 \
                                     nsIContent *aContent) override;

#define NS_DECL_NSIDOCUMENTOBSERVER_ATTEMPTTOEXECUTESCRIPT                   \
  NS_IMETHOD_(void) AttemptToExecuteScript(nsIContent *aContent,             \
                                  nsIParser *aParser,                        \
                                  bool *aBlock) override;

#else

#define NS_DECL_NSIDOCUMENTOBSERVER_BINDTODOCUMENT
#define NS_DECL_NSIDOCUMENTOBSERVER_ATTEMPTTOEXECUTESCRIPT

#endif

#define NS_DECL_NSIDOCUMENTOBSERVER                                          \
    NS_DECL_NSIDOCUMENTOBSERVER_BEGINUPDATE                                  \
    NS_DECL_NSIDOCUMENTOBSERVER_ENDUPDATE                                    \
    NS_DECL_NSIDOCUMENTOBSERVER_BEGINLOAD                                    \
    NS_DECL_NSIDOCUMENTOBSERVER_ENDLOAD                                      \
    NS_DECL_NSIDOCUMENTOBSERVER_CONTENTSTATECHANGED                          \
    NS_DECL_NSIDOCUMENTOBSERVER_DOCUMENTSTATESCHANGED                        \
    NS_DECL_NSIDOCUMENTOBSERVER_STYLESHEETADDED                              \
    NS_DECL_NSIDOCUMENTOBSERVER_STYLESHEETREMOVED                            \
    NS_DECL_NSIDOCUMENTOBSERVER_STYLESHEETAPPLICABLESTATECHANGED             \
    NS_DECL_NSIDOCUMENTOBSERVER_STYLERULECHANGED                             \
    NS_DECL_NSIDOCUMENTOBSERVER_STYLERULEADDED                               \
    NS_DECL_NSIDOCUMENTOBSERVER_STYLERULEREMOVED                             \
    NS_DECL_NSIDOCUMENTOBSERVER_BINDTODOCUMENT                               \
    NS_DECL_NSIDOCUMENTOBSERVER_ATTEMPTTOEXECUTESCRIPT                       \
    NS_DECL_NSIMUTATIONOBSERVER


#define NS_IMPL_NSIDOCUMENTOBSERVER_CORE_STUB(_class)                     \
void                                                                      \
_class::BeginUpdate(nsIDocument* aDocument, nsUpdateType aUpdateType)     \
{                                                                         \
}                                                                         \
void                                                                      \
_class::EndUpdate(nsIDocument* aDocument, nsUpdateType aUpdateType)       \
{                                                                         \
}                                                                         \
NS_IMPL_NSIMUTATIONOBSERVER_CORE_STUB(_class)

#define NS_IMPL_NSIDOCUMENTOBSERVER_LOAD_STUB(_class)                     \
void                                                                      \
_class::BeginLoad(nsIDocument* aDocument)                                 \
{                                                                         \
}                                                                         \
void                                                                      \
_class::EndLoad(nsIDocument* aDocument)                                   \
{                                                                         \
}

#define NS_IMPL_NSIDOCUMENTOBSERVER_STATE_STUB(_class)                    \
void                                                                      \
_class::ContentStateChanged(nsIDocument* aDocument,                       \
                            nsIContent* aContent,                         \
                            mozilla::EventStates aStateMask)              \
{                                                                         \
}                                                                         \
                                                                          \
void                                                                      \
_class::DocumentStatesChanged(nsIDocument* aDocument,                     \
                              mozilla::EventStates aStateMask)            \
{                                                                         \
}

#ifdef WINE_GECKO_SRC

#define NS_IMPL_NSIDOCUMENTOBSERVER_CONTENT(_class)                       \
NS_IMPL_NSIMUTATIONOBSERVER_CONTENT(_class) \
void _class::BindToDocument(nsIDocument *aDocument,                       \
                            nsIContent *aContent)                         \
{ \
} \
void _class::AttemptToExecuteScript(nsIContent *aContent,                 \
                                    nsIParser *aParser,                   \
                                    bool *aBlock)                         \
{ \
}

#else

#define NS_IMPL_NSIDOCUMENTOBSERVER_CONTENT(_class)

#endif

#define NS_IMPL_NSIDOCUMENTOBSERVER_STYLE_STUB(_class)                    \
void                                                                      \
_class::StyleSheetAdded(mozilla::StyleSheetHandle aStyleSheet,            \
                        bool aDocumentSheet)                              \
{                                                                         \
}                                                                         \
void                                                                      \
_class::StyleSheetRemoved(mozilla::StyleSheetHandle aStyleSheet,          \
                          bool aDocumentSheet)                            \
{                                                                         \
}                                                                         \
void                                                                      \
_class::StyleSheetApplicableStateChanged(mozilla::StyleSheetHandle aStyleSheet) \
{                                                                         \
}                                                                         \
void                                                                      \
_class::StyleRuleChanged(mozilla::StyleSheetHandle aStyleSheet)           \
{                                                                         \
}                                                                         \
void                                                                      \
_class::StyleRuleAdded(mozilla::StyleSheetHandle aStyleSheet)             \
{                                                                         \
}                                                                         \
void                                                                      \
_class::StyleRuleRemoved(mozilla::StyleSheetHandle aStyleSheet)           \
{                                                                         \
}

#endif /* nsIDocumentObserver_h___ */
