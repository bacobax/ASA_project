;; domain file: domain-deliveroo.pddl
(define (domain default)
    (:requirements :strips)
    
    (:predicates
        (tile ?t)
        (delivery ?t)
        (agent ?a)
        (parcel ?p)
        (me ?a)
        (at ?x ?t)                 
        (carrying ?a ?p)
        (right ?t1 ?t2)
        (left ?t1 ?t2)
        (up ?t1 ?t2)
        (down ?t1 ?t2)
    )

    (:action right
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (right ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    (:action left
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (left ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    (:action up
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (up ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    (:action down
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (down ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    (:action pickup
        :parameters (?me ?p ?t)
        :precondition (and
            (me ?me)
            (parcel ?p)
            (at ?me ?t)
            (at ?p ?t)
        )
        :effect (and
            (carrying ?me ?p)
            (not (at ?p ?t))
        )
    )

    (:action putdown
        :parameters (?me ?p ?t)
        :precondition (and
            (me ?me)
            (carrying ?me ?p)
            (at ?me ?t)
        )
        :effect (and
            (at ?p ?t)
            (not (carrying ?me ?p))
        )
    )
)