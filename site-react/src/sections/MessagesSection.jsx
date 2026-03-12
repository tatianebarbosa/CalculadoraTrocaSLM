import MessageCard from "../components/cards/MessageCard";

export default function MessagesSection({ calc, copiedKey, onCopy }) {
  return (
    <section className="panel panel--messages" id="mensagens">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Mensagens prontas</p>
          <h3>Copiar e enviar</h3>
        </div>
      </div>

      <div className="messages-grid">
        <MessageCard
          title="Mensagem para a escola"
          body={calc.schoolMessage}
          buttonLabel="Copiar mensagem para a escola"
          copied={copiedKey === "school"}
          onCopy={() => onCopy("school", calc.schoolMessage)}
        />
        <MessageCard
          title="Mensagem para o responsável"
          body={calc.guardianMessage}
          buttonLabel="Copiar mensagem para o responsável"
          copied={copiedKey === "guardian"}
          onCopy={() => onCopy("guardian", calc.guardianMessage)}
        />
      </div>
    </section>
  );
}
