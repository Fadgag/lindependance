export type MutationErrorContext =
  | "appointment-save"
  | "appointment-delete"
  | "appointment-move"
  | "appointment-resize"
  | "unavailability-save"
  | "unavailability-delete"
  | "payment-update"
  | "schedule-update"
  | "finance-update";

interface ErrorCopy {
  invalid: string;
  notFound: string;
  conflict: string;
  failure: string;
  network: string;
}

const ERROR_COPY: Record<MutationErrorContext, ErrorCopy> = {
  "appointment-save": {
    invalid: "Vérifiez les informations du rendez-vous, notamment la date, l'heure et la prestation.",
    notFound: "Ce rendez-vous n'est plus disponible. Actualisez l'agenda puis réessayez.",
    conflict: "Ce créneau vient d'être pris. Choisissez un autre horaire.",
    failure: "Le rendez-vous n'a pas pu être enregistré. Réessayez ou actualisez l'agenda.",
    network: "Impossible de confirmer l'enregistrement du rendez-vous. Vérifiez votre connexion et actualisez l'agenda avant de réessayer.",
  },
  "appointment-delete": {
    invalid: "La demande de suppression n'est pas valide. Actualisez l'agenda puis réessayez.",
    notFound: "Ce rendez-vous a déjà été supprimé ou n'est plus disponible. Actualisez l'agenda.",
    conflict: "Ce rendez-vous a changé. Actualisez l'agenda avant de réessayer.",
    failure: "Le rendez-vous n'a pas pu être supprimé. Réessayez ou actualisez l'agenda.",
    network: "Impossible de confirmer la suppression du rendez-vous. Vérifiez votre connexion et actualisez l'agenda avant de réessayer.",
  },
  "appointment-move": {
    invalid: "Le nouveau créneau n'est pas valide. Choisissez une autre date et une autre heure.",
    notFound: "Ce rendez-vous n'est plus disponible. Actualisez l'agenda.",
    conflict: "Ce créneau vient d'être pris. Choisissez un autre horaire.",
    failure: "Le rendez-vous n'a pas pu être déplacé. L'agenda a été rétabli ; actualisez-le puis réessayez.",
    network: "Le déplacement n'a pas pu être confirmé. Vérifiez votre connexion et actualisez l'agenda avant de réessayer.",
  },
  "appointment-resize": {
    invalid: "La nouvelle durée n'est pas valide. Choisissez une autre durée.",
    notFound: "Ce rendez-vous n'est plus disponible. Actualisez l'agenda.",
    conflict: "Cette durée crée un conflit avec un autre rendez-vous. Choisissez une autre durée.",
    failure: "La durée du rendez-vous n'a pas pu être modifiée. L'agenda a été rétabli ; actualisez-le puis réessayez.",
    network: "La modification de durée n'a pas pu être confirmée. Vérifiez votre connexion et actualisez l'agenda avant de réessayer.",
  },
  "unavailability-save": {
    invalid: "Vérifiez les dates : la fin doit être après le début.",
    notFound: "Le créneau à bloquer n'est plus disponible. Actualisez l'agenda puis réessayez.",
    conflict: "Ce créneau ne peut pas être bloqué car il entre en conflit avec un rendez-vous.",
    failure: "Le créneau n'a pas pu être bloqué. Réessayez ou actualisez l'agenda.",
    network: "Impossible de confirmer le blocage du créneau. Vérifiez votre connexion et actualisez l'agenda avant de réessayer.",
  },
  "unavailability-delete": {
    invalid: "La demande de suppression n'est pas valide. Actualisez l'agenda puis réessayez.",
    notFound: "Ce créneau a déjà été supprimé ou n'est plus disponible. Actualisez l'agenda.",
    conflict: "Ce créneau ne peut pas être supprimé pour le moment. Actualisez l'agenda puis réessayez.",
    failure: "Le créneau n'a pas pu être supprimé. Réessayez ou actualisez l'agenda.",
    network: "Impossible de confirmer la suppression du créneau. Vérifiez votre connexion et actualisez l'agenda avant de réessayer.",
  },
  "payment-update": {
    invalid: "Les informations du règlement ne sont pas valides. Vérifiez-les puis réessayez.",
    notFound: "Ce règlement n'est plus disponible. Actualisez la page puis réessayez.",
    conflict: "Ce règlement a changé. Actualisez la page avant de réessayer.",
    failure: "Le règlement n'a pas pu être mis à jour. Réessayez ou actualisez la page.",
    network: "Impossible de confirmer la mise à jour du règlement. Vérifiez votre connexion et actualisez la page avant de réessayer.",
  },
  "schedule-update": {
    invalid: "Les horaires ne sont pas valides. Vérifiez que l'ouverture est avant la fermeture.",
    notFound: "Les paramètres du salon ne sont plus disponibles. Actualisez la page puis réessayez.",
    conflict: "Les horaires ont changé. Actualisez la page avant de réessayer.",
    failure: "Les horaires n'ont pas pu être enregistrés. Réessayez ou actualisez la page.",
    network: "Impossible de confirmer l'enregistrement des horaires. Vérifiez votre connexion et actualisez la page avant de réessayer.",
  },
  "finance-update": {
    invalid: "L'objectif doit être un montant positif. Vérifiez la valeur puis réessayez.",
    notFound: "Les paramètres financiers ne sont plus disponibles. Actualisez la page puis réessayez.",
    conflict: "L'objectif financier a changé. Actualisez la page avant de réessayer.",
    failure: "L'objectif de chiffre d'affaires n'a pas pu être enregistré. Réessayez ou actualisez la page.",
    network: "Impossible de confirmer l'enregistrement de l'objectif. Vérifiez votre connexion et actualisez la page avant de réessayer.",
  },
};

export function getUserFacingMutationError(
  context: MutationErrorContext,
  status: number,
): string {
  if (status === 401) return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  if (status === 403) return "Vous n'êtes pas autorisé à effectuer cette action. Contactez votre responsable.";

  const copy = ERROR_COPY[context];
  if (status === 400) return copy.invalid;
  if (status === 404) return copy.notFound;
  if (status === 409) return copy.conflict;
  return copy.failure;
}

export function getUserFacingNetworkError(context: MutationErrorContext): string {
  return ERROR_COPY[context].network;
}
