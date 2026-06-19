// Support Ticket Page Start
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaArrowRight,
  FaCalendarCheck,
  FaCheckCircle,
  FaClock,
  FaComments,
  FaFileAlt,
  FaLifeRing,
  FaPaperPlane,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTicketAlt,
  FaTimes,
  FaTruck
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { useLanguage } from '../context/LanguageContext';
import {
  formatDate,
  formatDateTime,
  formatStatus
} from '../utils/helpers';
import '../styles/SupportTicket.css';

const SupportTicket = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const { getTranslation, isBangla } = useLanguage();
  const copy = getTranslation('support');

  const ui = useMemo(
    () =>
      isBangla
        ? {
            totalTickets: 'মোট টিকিট',
            openTickets: 'খোলা টিকিট',
            activeConversation: 'চলমান আলোচনা',
            solvedTickets: 'সমাধান হয়েছে',
            helpTitle: 'যেসব বিষয়ে সহায়তা পাবেন',
            helpSubtitle: 'টিকিট তৈরি করার আগে আপনার সমস্যার ধরন দেখে নিন।',
            helpTopics: [
              {
                icon: FaFileAlt,
                title: 'আবেদন ও ডকুমেন্ট',
                description: 'আবেদন স্ট্যাটাস, ডকুমেন্ট আপলোড বা তথ্য মিল না হলে সাহায্য নিন।'
              },
              {
                icon: FaCalendarCheck,
                title: 'অ্যাপয়েন্টমেন্ট',
                description: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট, সময়সূচি বা সেন্টার সংক্রান্ত প্রশ্ন।'
              },
              {
                icon: FaTruck,
                title: 'ডেলিভারি ও পেমেন্ট',
                description: 'ডেলিভারি ফি, পেমেন্ট, ঠিকানা বা কার্ড গ্রহণ সংক্রান্ত সহায়তা।'
              }
            ],
            latestActivity: 'সর্বশেষ আপডেট',
            noConversation: 'এখনো কোনো উত্তর নেই',
            ticketDetails: 'টিকিট বিস্তারিত',
            emptyHint: 'প্রথম টিকিট তৈরি করলে এখানে কথোপকথন দেখা যাবে।',
            categoryFallback: 'সাধারণ',
            priority: 'অগ্রাধিকার',
            status: 'স্ট্যাটাস'
          }
        : {
            totalTickets: 'Total Tickets',
            openTickets: 'Open Tickets',
            activeConversation: 'In Progress',
            solvedTickets: 'Resolved',
            helpTitle: 'What support can help with',
            helpSubtitle: 'Choose the right category before creating a ticket.',
            helpTopics: [
              {
                icon: FaFileAlt,
                title: 'Application & Documents',
                description: 'Application status, uploaded documents, or information mismatch issues.'
              },
              {
                icon: FaCalendarCheck,
                title: 'Appointments',
                description: 'Biometric appointment, schedule, center, or rescheduling related questions.'
              },
              {
                icon: FaTruck,
                title: 'Delivery & Payment',
                description: 'Delivery fee, payment, address, or card receiving support.'
              }
            ],
            latestActivity: 'Latest update',
            noConversation: 'No replies yet',
            ticketDetails: 'Ticket Details',
            emptyHint: 'Create your first ticket and the conversation will appear here.',
            categoryFallback: 'General',
            priority: 'Priority',
            status: 'Status'
          },
    [isBangla]
  );

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ticketStats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === 'open').length;
    const inProgress = tickets.filter((ticket) => ticket.status === 'in_progress').length;
    const solved = tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length;

    return {
      total: tickets.length,
      open,
      inProgress,
      solved
    };
  }, [tickets]);

  const fetchTickets = async (shouldKeepSelection = true) => {
    try {
      setLoading(true);
      const response = await api.get('/support/my-tickets');
      const ticketList = response?.data?.data || [];

      setTickets(ticketList);

      if (!shouldKeepSelection && ticketList.length > 0) {
        handleSelectTicket(ticketList[0]._id);
        return;
      }

      if (
        selectedTicket?._id &&
        ticketList.some((ticket) => ticket._id === selectedTicket._id)
      ) {
        return;
      }

      if (!selectedTicket && ticketList.length > 0) {
        handleSelectTicket(ticketList[0]._id);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error(error?.response?.data?.message || copy.toasts?.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticketId) => {
    try {
      setDetailsLoading(true);
      const response = await api.get(`/support/tickets/${ticketId}`);
      const ticketDetails = response?.data?.data || null;
      setSelectedTicket(ticketDetails);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error(error?.response?.data?.message || copy.toasts?.detailsFailed);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateTicket = async (data) => {
    setIsSubmitting(true);

    try {
      const response = await api.post('/support/tickets', data);
      const createdTicket = response?.data?.data;

      toast.success(copy.toasts?.createSuccess);
      setShowCreateModal(false);
      reset();

      await fetchTickets(false);

      if (createdTicket?._id) {
        await handleSelectTicket(createdTicket._id);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.msg ||
          copy.toasts?.createFailed
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const messageText = newMessage.trim();
    if (!messageText || !selectedTicket?._id) return;

    const ticketId = selectedTicket._id;
    const previousTicket = selectedTicket;
    const now = new Date().toISOString();
    const temporaryReplyId = `local-${Date.now()}`;

    const optimisticReply = {
      _id: temporaryReplyId,
      message: messageText,
      responderRole: 'citizen',
      createdAt: now
    };

    setSendingMessage(true);
    setNewMessage('');

    setSelectedTicket((currentTicket) => {
      if (!currentTicket || currentTicket._id !== ticketId) return currentTicket;

      return {
        ...currentTicket,
        updatedAt: now,
        responses: [...(currentTicket.responses || []), optimisticReply]
      };
    });

    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket._id === ticketId
          ? {
              ...ticket,
              updatedAt: now
            }
          : ticket
      )
    );

    try {
      const response = await api.post(`/support/tickets/${ticketId}/respond`, {
        message: messageText
      });

      const responseData = response?.data?.data;
      const serverTicket = responseData?.responses ? responseData : null;
      const serverReply =
        responseData?.response ||
        responseData?.reply ||
        response?.data?.response ||
        response?.data?.reply ||
        null;

      if (serverTicket) {
        setSelectedTicket(serverTicket);
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket._id === ticketId
              ? {
                  ...ticket,
                  status: serverTicket.status || ticket.status,
                  updatedAt: serverTicket.updatedAt || ticket.updatedAt
                }
              : ticket
          )
        );
      } else if (serverReply?.message) {
        setSelectedTicket((currentTicket) => {
          if (!currentTicket || currentTicket._id !== ticketId) return currentTicket;

          return {
            ...currentTicket,
            updatedAt: serverReply.createdAt || now,
            responses: (currentTicket.responses || []).map((reply) =>
              reply._id === temporaryReplyId ? serverReply : reply
            )
          };
        });
      }

      toast.success(copy.toasts?.messageSuccess);
    } catch (error) {
      setSelectedTicket(previousTicket);
      setNewMessage(messageText);
      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket._id === ticketId
            ? {
                ...ticket,
                updatedAt: previousTicket?.updatedAt || ticket.updatedAt
              }
            : ticket
        )
      );

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.msg ||
          copy.toasts?.messageFailed
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <FaClock />;
      case 'in_progress':
        return <FaComments />;
      case 'resolved':
      case 'closed':
        return <FaCheckCircle />;
      default:
        return <FaClock />;
    }
  };

  const getTranslatedStatus = (status) => copy.statuses?.[status] || formatStatus(status);

  const getTranslatedCategory = (category) =>
    copy.categories?.[category] || formatStatus(category) || ui.categoryFallback;

  const getTranslatedPriority = (priority) => copy.priorities?.[priority] || formatStatus(priority);

  const renderTemplate = (template = '', variables = {}) =>
    Object.entries(variables).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, value),
      template
    );

  const getTicketNumber = (ticket) => {
    const number = ticket?.ticketNumber || ticket?._id?.slice(-8) || 'TICKET';
    return String(number).startsWith('#') ? number : `#${number}`;
  };

  const renderTicketCard = (ticket) => {
    const isActive = selectedTicket?._id === ticket._id;
    const latestActivity = ticket.updatedAt || ticket.createdAt;

    return (
      <button
        key={ticket._id}
        type="button"
        className={`support-ticket-card ${isActive ? 'is-active' : ''}`}
        onClick={() => handleSelectTicket(ticket._id)}
      >
        <div className="support-ticket-card-top">
          <span className="support-ticket-number">{getTicketNumber(ticket)}</span>
          <span className={`support-status-icon status-${ticket.status || 'open'}`}>
            {getStatusIcon(ticket.status)}
          </span>
        </div>

        <h4>{ticket.subject}</h4>

        <div className="support-ticket-meta-row">
          <span className={`support-badge status-${ticket.status || 'open'}`}>
            {getTranslatedStatus(ticket.status)}
          </span>
          {ticket.priority && (
            <span className={`support-badge priority-${ticket.priority}`}>
              {getTranslatedPriority(ticket.priority)}
            </span>
          )}
        </div>

        <p className="support-ticket-date">
          {ui.latestActivity}: {formatDate(latestActivity)}
        </p>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="support-loading-wrapper">
        <Loader size="large" text={copy.loadingTickets} />
      </div>
    );
  }

  return (
    <div className={`support-page-wrapper ${isBangla ? 'support-bn' : 'support-en'}`}>
      <div className="support-page-shell">
        <section className="support-page-head">
          <div>
            <h1 className="support-page-title">{copy.title}</h1>
            <p className="support-page-subtitle">{copy.subtitle}</p>
          </div>

          <button
            type="button"
            className="support-primary-button"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus />
            <span>{copy.createNewTicket}</span>
          </button>
        </section>

        <section className="support-stat-grid" aria-label="Support ticket summary">
          <div className="support-stat-card">
            <span className="support-stat-icon"><FaTicketAlt /></span>
            <div>
              <p>{ui.totalTickets}</p>
              <strong>{ticketStats.total}</strong>
            </div>
          </div>
          <div className="support-stat-card">
            <span className="support-stat-icon"><FaClock /></span>
            <div>
              <p>{ui.openTickets}</p>
              <strong>{ticketStats.open}</strong>
            </div>
          </div>
          <div className="support-stat-card">
            <span className="support-stat-icon"><FaComments /></span>
            <div>
              <p>{ui.activeConversation}</p>
              <strong>{ticketStats.inProgress}</strong>
            </div>
          </div>
          <div className="support-stat-card">
            <span className="support-stat-icon"><FaCheckCircle /></span>
            <div>
              <p>{ui.solvedTickets}</p>
              <strong>{ticketStats.solved}</strong>
            </div>
          </div>
        </section>

        {tickets.length === 0 ? (
          <section className="support-empty-layout">
            <div className="support-empty-card">
              <div className="support-empty-icon">
                <FaLifeRing />
              </div>
              <h2>{copy.noTicketsTitle}</h2>
              <p>{copy.noTicketsDescription}</p>
              <button
                type="button"
                className="support-primary-button"
                onClick={() => setShowCreateModal(true)}
              >
                <FaPlus />
                <span>{copy.createTicket}</span>
              </button>
            </div>

            <div className="support-help-card">
              <div className="support-section-heading">
                <h2>{ui.helpTitle}</h2>
                <p>{ui.helpSubtitle}</p>
              </div>
              <div className="support-help-list">
                {ui.helpTopics.map((topic) => {
                  const TopicIcon = topic.icon;
                  return (
                    <div className="support-help-item" key={topic.title}>
                      <span><TopicIcon /></span>
                      <div>
                        <h3>{topic.title}</h3>
                        <p>{topic.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section className="support-workspace">
            <aside className="support-ticket-panel">
              <div className="support-panel-head">
                <div>
                  <h2>{copy.myTickets}</h2>
                  <p>{tickets.length} {copy.activeSupport}</p>
                </div>
                <span className="support-soft-chip">{copy.activeSupport}</span>
              </div>

              <div className="support-ticket-list">
                {tickets.map(renderTicketCard)}
              </div>
            </aside>

            <main className="support-details-panel">
              {detailsLoading ? (
                <div className="support-details-loader">
                  <Loader size="medium" text={copy.loadingDetails} />
                </div>
              ) : selectedTicket ? (
                <>
                  <div className="support-details-header">
                    <div>
                      <p className="support-eyebrow">{ui.ticketDetails}</p>
                      <h2>{getTicketNumber(selectedTicket)}</h2>
                      <p>{selectedTicket.subject}</p>
                    </div>
                    <span className={`support-badge status-${selectedTicket.status || 'open'}`}>
                      {getTranslatedStatus(selectedTicket.status)}
                    </span>
                  </div>

                  <div className="support-info-grid">
                    <div className="support-info-card">
                      <span>{copy.category}</span>
                      <strong>{getTranslatedCategory(selectedTicket.category)}</strong>
                    </div>
                    <div className="support-info-card">
                      <span>{ui.priority}</span>
                      <strong>{getTranslatedPriority(selectedTicket.priority || 'medium')}</strong>
                    </div>
                    <div className="support-info-card">
                      <span>{copy.created}</span>
                      <strong>{formatDateTime(selectedTicket.createdAt)}</strong>
                    </div>
                    <div className="support-info-card">
                      <span>{ui.status}</span>
                      <strong>{getTranslatedStatus(selectedTicket.status)}</strong>
                    </div>
                  </div>

                  <div className="support-conversation-section">
                    <div className="support-section-heading compact">
                      <h3>{copy.conversation}</h3>
                      <p>{selectedTicket.responses?.length ? `${selectedTicket.responses.length} replies` : ui.noConversation}</p>
                    </div>

                    <div className="support-messages-list">
                      <div className="support-message-item support-message-user">
                        <div className="support-message-head">
                          <span>{copy.you}</span>
                          <time>{formatDateTime(selectedTicket.createdAt)}</time>
                        </div>
                        <p>{selectedTicket.description}</p>
                      </div>

                      {selectedTicket.responses?.map((response, index) => {
                        const isAdmin =
                          response.responderRole === 'admin' ||
                          response.responderRole === 'super_admin';

                        return (
                          <div
                            key={`${response.createdAt}-${index}`}
                            className={`support-message-item ${isAdmin ? 'support-message-admin' : 'support-message-user'}`}
                          >
                            <div className="support-message-head">
                              <span>{isAdmin ? copy.supportTeam : copy.you}</span>
                              <time>{formatDateTime(response.createdAt)}</time>
                            </div>
                            <p>{response.message}</p>
                          </div>
                        );
                      })}
                    </div>

                    {!['resolved', 'closed'].includes(selectedTicket.status) ? (
                      <form className="support-reply-form" onSubmit={handleSendMessage}>
                        <label>{copy.replyMessage}</label>
                        <textarea
                          rows={4}
                          value={newMessage}
                          onChange={(event) => setNewMessage(event.target.value)}
                          placeholder={copy.replyPlaceholder}
                          className="support-reply-input"
                        />
                        <div className="support-reply-actions">
                          <button
                            type="submit"
                            className="support-send-button"
                            disabled={sendingMessage || !newMessage.trim()}
                          >
                            {sendingMessage ? (
                              <>
                                <FaSpinner className="animate-spin" />
                                <span>{copy.sending}</span>
                              </>
                            ) : (
                              <>
                                <FaPaperPlane />
                                <span>{copy.sendMessage}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="support-closed-note">
                        {renderTemplate(copy.closedNote, {
                          status: getTranslatedStatus(selectedTicket.status)
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="support-no-selection">
                  <FaComments />
                  <h3>{copy.selectTicketTitle}</h3>
                  <p>{copy.selectTicketDescription}</p>
                  {tickets.length > 0 && (
                    <button
                      type="button"
                      className="support-primary-button"
                      onClick={() => handleSelectTicket(tickets[0]._id)}
                    >
                      <span>{copy.openFirstTicket}</span>
                      <FaArrowRight />
                    </button>
                  )}
                </div>
              )}
            </main>
          </section>
        )}

        {showCreateModal && (
          <div
            className="support-modal-overlay"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="support-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="support-modal-header">
                <div className="support-modal-heading">
                  <span><FaTicketAlt /></span>
                  <div>
                    <h3>{copy.modalTitle}</h3>
                    <p>{copy.modalSubtitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="support-modal-close"
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleCreateTicket)}>
                <div className="support-modal-body">
                  <div className="support-form-group">
                    <label>{copy.subjectLabel}</label>
                    <input
                      type="text"
                      className={errors.subject ? 'has-error' : ''}
                      placeholder={copy.subjectPlaceholder}
                      {...register('subject', { required: copy.validation?.subjectRequired })}
                    />
                    {errors.subject && <span>{errors.subject.message}</span>}
                  </div>

                  <div className="support-form-row">
                    <div className="support-form-group">
                      <label>{copy.categoryLabel}</label>
                      <select
                        className={errors.category ? 'has-error' : ''}
                        {...register('category', { required: copy.validation?.categoryRequired })}
                      >
                        <option value="">{copy.selectCategory}</option>
                        <option value="application_issue">{copy.categories?.application_issue}</option>
                        <option value="appointment">{copy.categories?.appointment}</option>
                        <option value="payment">{copy.categories?.payment}</option>
                        <option value="delivery">{copy.categories?.delivery}</option>
                        <option value="technical">{copy.categories?.technical}</option>
                        <option value="other">{copy.categories?.other}</option>
                      </select>
                      {errors.category && <span>{errors.category.message}</span>}
                    </div>

                    <div className="support-form-group">
                      <label>{copy.priorityLabel}</label>
                      <select {...register('priority')} defaultValue="medium">
                        <option value="low">{copy.priorities?.low}</option>
                        <option value="medium">{copy.priorities?.medium}</option>
                        <option value="high">{copy.priorities?.high}</option>
                        <option value="urgent">{copy.priorities?.urgent}</option>
                      </select>
                    </div>
                  </div>

                  <div className="support-form-group">
                    <label>{copy.descriptionLabel}</label>
                    <textarea
                      rows={5}
                      className={errors.description ? 'has-error' : ''}
                      placeholder={copy.descriptionPlaceholder}
                      {...register('description', {
                        required: copy.validation?.descriptionRequired,
                        minLength: {
                          value: 20,
                          message: copy.validation?.descriptionMin
                        }
                      })}
                    />
                    {errors.description && <span>{errors.description.message}</span>}
                  </div>
                </div>

                <div className="support-modal-footer">
                  <button
                    type="button"
                    className="support-secondary-button"
                    onClick={() => setShowCreateModal(false)}
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="submit"
                    className="support-primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>{copy.creating}</span>
                      </>
                    ) : (
                      <span>{copy.createTicket}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTicket;
// Support Ticket Page End
